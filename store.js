import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';

export async function createStore({mongoUri, dataDir}) {
  if (mongoUri) {
    const connection = await mongoose.createConnection(mongoUri, {serverSelectionTimeoutMS: 8000}).asPromise();
    const userSchema = new mongoose.Schema({
      _id: {type: String, default: () => crypto.randomUUID()},
      name: {type: String, required: true}, email: {type: String, required: true, unique: true},
      passwordHash: {type: String, required: true}, createdAt: String
    }, {versionKey: false});
    const faqSchema = new mongoose.Schema({
      _id: {type: String, default: () => crypto.randomUUID()},
      owner: {type: String, required: true, index: true},
      question: {type: String, required: true, maxlength: 300},
      answer: {type: String, required: true, maxlength: 5000},
      category: {type: String, default: 'General'}, source: String,
      createdAt: String, updatedAt: String
    }, {versionKey: false});
    const User = connection.model('User', userSchema);
    const Faq = connection.model('Faq', faqSchema);
    await Promise.all([User.init(), Faq.init()]);
    const clean = x => x && ({...x, id: x._id, _id: undefined});
    return {
      mode: 'MongoDB',
      findUser: async email => clean(await User.findOne({email}).lean()),
      getUser: async id => clean(await User.findById(id).lean()),
      addUser: async user => clean((await User.create(user)).toObject()),
      list: async owner => (await Faq.find({owner}).sort({createdAt: -1}).lean()).map(clean),
      add: async (owner, faq) => clean((await Faq.create({...faq, owner})).toObject()),
      update: async (owner, id, faq) => clean(await Faq.findOneAndUpdate({_id: id, owner}, {$set: faq}, {new: true, runValidators: true}).lean()),
      remove: async (owner, id) => (await Faq.deleteOne({_id: id, owner})).deletedCount > 0,
      close: () => connection.close()
    };
  }
  await fs.mkdir(dataDir, {recursive: true});
  const file = path.join(dataDir, 'database.json');
  let state;
  try { state = JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = {users: [], faqs: []};
  }
  let queue = Promise.resolve();
  const mutate = fn => {
    const operation = queue.then(async () => {
      const draft = structuredClone(state);
      const result = fn(draft);
      await fs.writeFile(file + '.tmp', JSON.stringify(draft, null, 2));
      await fs.rename(file + '.tmp', file);
      state = draft;
      return structuredClone(result);
    });
    queue = operation.catch(() => {});
    return operation;
  };
  return {
    mode: 'Local demo',
    findUser: async email => structuredClone(state.users.find(x => x.email === email)),
    getUser: async id => structuredClone(state.users.find(x => x.id === id)),
    addUser: user => mutate(draft => {
      if (draft.users.some(x => x.email === user.email)) {
        const error = new Error('Duplicate account'); error.code = 11000; throw error;
      }
      const result = {...user, id: crypto.randomUUID()};
      draft.users.push(result); return result;
    }),
    list: async owner => structuredClone(state.faqs.filter(x => x.owner === owner).reverse()),
    add: (owner, faq) => mutate(draft => {
      const result = {...faq, owner, id: crypto.randomUUID()};
      draft.faqs.push(result); return result;
    }),
    update: (owner, id, faq) => mutate(draft => {
      const result = draft.faqs.find(x => x.id === id && x.owner === owner);
      if (!result) return null;
      Object.assign(result, faq); return result;
    }),
    remove: (owner, id) => mutate(draft => {
      const index = draft.faqs.findIndex(x => x.id === id && x.owner === owner);
      if (index < 0) return false;
      draft.faqs.splice(index, 1); return true;
    }),
    close: async () => { await queue; }
  };
}


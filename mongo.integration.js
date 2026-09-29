import {MongoMemoryServer} from 'mongodb-memory-server';
import {createStore} from '../src/store.js';
import assert from 'node:assert/strict';
const mongo=await MongoMemoryServer.create();
let store;
try{
 store=await createStore({mongoUri:mongo.getUri()});
 const user=await store.addUser({name:'Mongo student',email:'mongo@example.com',passwordHash:'test-hash',createdAt:new Date().toISOString()});
 assert.equal((await store.getUser(user.id)).email,'mongo@example.com');
 const faq=await store.add(user.id,{question:'Does MongoDB work?',answer:'Yes, this was tested against an actual MongoDB process.',category:'General',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 assert.equal((await store.list(user.id)).length,1);assert.equal((await store.list('other-user')).length,0);
 assert.equal(await store.update('other-user',faq.id,{answer:'Attack'}),null);
 assert.equal((await store.update(user.id,faq.id,{answer:'Updated answer'})).answer,'Updated answer');
 await assert.rejects(()=>store.addUser({name:'Duplicate',email:'mongo@example.com',passwordHash:'x'}),error=>error.code===11000);
 assert.equal(await store.remove('other-user',faq.id),false);assert.equal(await store.remove(user.id,faq.id),true);
 console.log('PASS: MongoDB connection, schemas, unique email, CRUD, and owner isolation.');
}finally{if(store)await store.close();await mongo.stop();}


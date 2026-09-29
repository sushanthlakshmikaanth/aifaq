import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.js';
import {createAI} from './ai.js';
import {createApp} from './app.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const production=process.env.NODE_ENV==='production';
const dataDir=process.env.DATA_DIR || path.join(root,'data');
await fs.mkdir(dataDir,{recursive:true});
let secret=process.env.JWT_SECRET;
if (production && (!secret || secret.length<32)) throw new Error('Production requires JWT_SECRET with at least 32 characters.');
if (production && !process.env.MONGODB_URI) throw new Error('Production requires MONGODB_URI.');
if (!secret) {
 const file=path.join(dataDir,'session-secret');
 try {secret=await fs.readFile(file,'utf8');}
 catch(error) {if(error.code!=='ENOENT')throw error;secret=crypto.randomBytes(48).toString('hex');await fs.writeFile(file,secret,{mode:0o600});}
}
let embeddedMongo, mongoUri=process.env.MONGODB_URI;
if (!mongoUri && process.env.DEMO_MONGO==='1' && !production) {
 const {MongoMemoryServer}=await import('mongodb-memory-server');
 const dbPath=path.join(dataDir,'mongodb');
 await fs.mkdir(dbPath,{recursive:true});
 embeddedMongo=await MongoMemoryServer.create({instance:{dbPath,storageEngine:'wiredTiger',ip:'127.0.0.1'}});
 mongoUri=embeddedMongo.getUri('ai_faq_assistant');
 console.log('Local MongoDB started. Database files persist in data/mongodb.');
}
let store;
try {store=await createStore({mongoUri,dataDir});}
catch(error){if(embeddedMongo)await embeddedMongo.stop({doCleanup:false,force:false});throw error;}
const ai=createAI({key:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||'gpt-4o-mini',embeddingModel:process.env.EMBEDDING_MODEL||'text-embedding-3-small'});
const app=createApp({store,ai,secret,production});
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const server=app.listen(port,host,()=>console.log('AI FAQ Assistant: http://'+host+':'+port+'\nStorage: '+store.mode+'\nAI: '+(ai.enabled?'OpenAI enabled':'Extractive demo (no API key)')));
server.on('error',async error=>{console.error(error.code==='EADDRINUSE'?'Port is already in use. Set PORT in .env.':error.message);await store.close();if(embeddedMongo)await embeddedMongo.stop({doCleanup:false,force:false});process.exit(1);});
let stopping=false;
async function stop(){if(stopping)return;stopping=true;server.close(async()=>{await store.close();if(embeddedMongo)await embeddedMongo.stop({doCleanup:false,force:false});process.exit(0);});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);


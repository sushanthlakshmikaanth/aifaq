import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../src/store.js';
import {createApp} from '../src/app.js';
import {createAI} from '../src/ai.js';

test('REST API: authentication, ownership, persistence, drafting, and errors',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'faq-test-'));
 const store=await createStore({dataDir:dir});
 const app=createApp({store,ai:createAI({}),secret:'test-secret-at-least-thirty-two-characters',rateLimits:false});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 async function req(route,body,token,method=body?'POST':'GET',extra={}){
   const r=await fetch(url+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
   return {status:r.status,body:await r.json(),headers:r.headers};
 }
 let alice,bob,faq;
 try {
 await t.test('protected routes reject anonymous requests',async()=>{assert.equal((await req('/faqs')).status,401);});
 await t.test('registers a user with an HttpOnly cookie and never exposes password hash',async()=>{
   const result=await req('/auth/register',{name:'Alice',email:'ALICE@example.com',password:'StrongPass123!'});
   assert.equal(result.status,201);assert.match(result.headers.get('set-cookie'),/HttpOnly/);assert.match(result.headers.get('set-cookie'),/SameSite=Strict/);
   assert.equal(result.body.user.email,'alice@example.com');assert.equal(result.body.user.passwordHash,undefined);alice=result.body;
 });
 await t.test('duplicate email rejected',async()=>{assert.equal((await req('/auth/register',{name:'Alice',email:'alice@example.com',password:'StrongPass123!'})).status,409);});
 await t.test('wrong password rejected; correct password accepted',async()=>{
   assert.equal((await req('/auth/login',{email:'alice@example.com',password:'WrongPass123!'})).status,401);
   assert.equal((await req('/auth/login',{email:'alice@example.com',password:'StrongPass123!'})).status,200);
 });
 await t.test('JWT cookie authenticates and forged bearer token is rejected',async()=>{
   assert.equal((await req('/auth/me',null,null,'GET',{Cookie:'faq_session='+alice.token})).status,200);
   assert.equal((await req('/auth/me',null,'forged.token')).status,401);
 });
 await t.test('creates a FAQ with validation and safe field allowlist',async()=>{
   const result=await req('/faqs',{question:'What is the refund policy?',answer:'Refunds are available within 14 days of purchase.',category:'Billing'},alice.token);
   assert.equal(result.status,201);faq=result.body.faq;
   assert.equal((await req('/faqs',{question:'Bad',answer:'Too short',owner:'another'},alice.token)).status,400);
 });
 await t.test('another user cannot read, edit, or delete the FAQ',async()=>{
   bob=(await req('/auth/register',{name:'Bob',email:'bob@example.com',password:'StrongPass123!'})).body;
   assert.deepEqual((await req('/faqs',null,bob.token)).body.faqs,[]);
   assert.equal((await req('/faqs/'+faq.id,{question:'Changed question?',answer:'Changed answer',category:'General'},bob.token,'PUT')).status,404);
   assert.equal((await req('/faqs/'+faq.id,null,bob.token,'DELETE')).status,404);
 });
 await t.test('synonym search cites a saved FAQ and unknown queries abstain',async()=>{
   const result=await req('/search',{query:'How can I get my money back?'},alice.token);
   assert.equal(result.body.matched,true);assert.equal(result.body.source.id,faq.id);assert.equal(result.body.mode,'keyword-demo');
   assert.equal((await req('/search',{query:'quantum asteroid telescope'},alice.token)).body.matched,false);
   assert.equal((await req('/search',{query:'refund'},bob.token)).body.matched,false);
 });
 await t.test('drafts are generated from source but not automatically published',async()=>{
   const before=(await store.list(alice.user.id)).length;
   const result=await req('/generate',{text:'Customers can request a refund within 14 days. Standard delivery takes 3 to 5 business days.',count:5},alice.token);
   assert.equal(result.status,200);assert.equal(result.body.mode,'extractive-demo');assert.ok(result.body.drafts.length>=2);
   assert.equal((await store.list(alice.user.id)).length,before);
   assert.equal((await req('/generate',{text:'short',count:99},alice.token)).status,400);
 });
 await t.test('updates persist and survive reopening local storage',async()=>{
   const result=await req('/faqs/'+faq.id,{question:faq.question,answer:'Refunds are available within 30 days.',category:'Billing'},alice.token,'PUT');
   assert.equal(result.status,200);
   const reopened=await createStore({dataDir:dir});assert.match((await reopened.list(alice.user.id))[0].answer,/30 days/);await reopened.close();
   const disk=await fs.readFile(path.join(dir,'database.json'),'utf8');
   assert.equal(disk.includes('StrongPass123!'),false);assert.match(disk,/\$2[aby]\$/);
 });
 await t.test('cross-site mutations and malformed JSON are rejected safely',async()=>{
   assert.equal((await req('/faqs',{question:'A valid question?',answer:'A valid answer.',category:'General'},alice.token,'POST',{Origin:'https://evil.example'})).status,403);
   const response=await fetch(url+'/api/faqs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+alice.token},body:'{bad'});
   assert.equal(response.status,400);const data=await response.json();assert.equal(data.error,'Request body must be valid JSON.');assert.equal(data.stack,undefined);
 });
 await t.test('sample seeding is repeat-safe',async()=>{
   await req('/faqs/sample',{},bob.token);const next=await req('/faqs/sample',{},bob.token);assert.equal(next.body.added,0);
   assert.equal((await store.list(bob.user.id)).length,6);
 });
 await t.test('deletion removes FAQ and logout expires the cookie',async()=>{
   assert.equal((await req('/faqs/'+faq.id,null,alice.token,'DELETE')).status,200);
   assert.equal((await req('/faqs/'+faq.id,null,alice.token,'DELETE')).status,404);
   const result=await req('/auth/logout',{},alice.token);assert.match(result.headers.get('set-cookie'),/Max-Age=0/);
 });
 await t.test('serves the complete UI with security headers',async()=>{
   const response=await fetch(url);assert.equal(response.status,200);assert.match(await response.text(),/FAQ assistant/);
   assert.ok(response.headers.get('content-security-policy'));assert.equal(response.headers.get('x-powered-by'),null);
   assert.equal((await req('/does-not-exist')).status,404);
 });
 }finally{await new Promise(resolve=>server.close(resolve));await store.close();await fs.rm(dir,{recursive:true,force:true});}
});


import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAI,extractDrafts,keywordSearch} from '../src/ai.js';
test('extracts explicit Q/A pairs without inventing answer content',()=>{
 const result=extractDrafts('Q: How long does shipping take?\nA: Shipping takes three days.\nQ: Can I return an item?\nA: Returns are accepted for 14 days.',5);
 assert.equal(result.length,2);assert.equal(result[0].answer,'Shipping takes three days.');
});
test('empty and stopword searches produce no match',()=>{
 assert.deepEqual(keywordSearch('how are you',[]),[]);
});
test('AI generation uses structured schema and parses the response (mock provider)',async()=>{
 let requestBody;
 const ai=createAI({key:'test-key',fetcher:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');requestBody=JSON.parse(options.body);
  return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify({drafts:[{question:'How long is delivery?',answer:'Delivery takes three days.',category:'Orders'}]})}]}]})};
 }});
 const result=await ai.generate('Delivery takes three days.',3);
 assert.equal(result.mode,'ai');assert.equal(result.drafts.length,1);assert.equal(requestBody.store,false);assert.equal(requestBody.text.format.strict,true);
});
test('semantic search ranks embeddings and reuses cache (mock provider)',async()=>{
 let calls=0;
 const ai=createAI({key:'test-key',fetcher:async(url,options)=>{
  calls++;assert.match(url,/embeddings$/);const body=JSON.parse(options.body);
  return {ok:true,json:async()=>({data:body.input.map((text,index)=>({index,embedding:/refund|money/i.test(text)?[1,0,0]:[0,1,0]}))})};
 }});
 const faqs=[{id:'a',question:'Refund policy?',answer:'Refund within 14 days.'},{id:'b',question:'Shipping?',answer:'Three days.'}];
 const first=await ai.search('money back',faqs);assert.equal(first.mode,'semantic');assert.equal(first.results[0].faq.id,'a');
 await ai.search('money back',faqs);assert.equal(calls,1);
});
test('provider failures and malformed output are sanitized',async()=>{
 const failed=createAI({key:'x',fetcher:async()=>({ok:false,status:401})});
 await assert.rejects(()=>failed.generate('Some content',3),error=>error.status===502&&!error.message.includes('secret'));
 const bad=createAI({key:'x',fetcher:async()=>({ok:true,json:async()=>({output:[]})})});
 await assert.rejects(()=>bad.generate('Some content',3),error=>error.status===502);
});


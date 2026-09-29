
const $=selector=>document.querySelector(selector);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user,health,faqs=[],currentPage='knowledge',filter='All',search='',drafts=[],chat=[];
let registering=false,draftIndex=null,chatBusy=false,sourceText='',draftCount=5,generating=false;
const categories=['General','Account','Billing','Orders','Support'];
async function api(url,options={}){
 const response=await fetch('/api'+url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
 const data=await response.json();
 if(!response.ok){if(response.status===401&&!url.startsWith('/auth'))showAuth();throw new Error(data.error||'Request failed.');}
 return data;
}
function toast(message,failure=false){const e=$('#toast');e.textContent=message;e.classList.toggle('failure',failure);e.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.hidden=true,4000);}
function showAuth(){user=null;$('#workspace').hidden=true;$('#auth-screen').hidden=false;}
async function enterWorkspace(account){
 user=account;faqs=(await api('/faqs')).faqs;$('#auth-screen').hidden=true;$('#workspace').hidden=false;
 $('#user-name').textContent=user.name;$('#user-avatar').textContent=user.name[0].toUpperCase();$('#storage-label').textContent=health.storage;
 $('#mode-label').textContent=health.aiEnabled?'AI connected':'Local demo mode';
 $('#mode-description').textContent=health.aiEnabled?'AI drafting and semantic search are available.':'Extractive drafts and keyword search. Connect an AI key to enable semantic search.';render();
}
$('#auth-toggle').onclick=()=>{
 registering=!registering;$('#name-label').hidden=!registering;$('#auth-form').elements.name.required=registering;
 $('#auth-title').textContent=registering?'A fresh start.':'Welcome back.';
 $('#auth-description').textContent=registering?'Create your own space for better answers.':'Sign in to keep your answers in one place.';
 $('#auth-submit').textContent=registering?'Create account ↗':'Sign in ↗';$('#auth-toggle').textContent=registering?'Sign in':'Create an account';
 $('#auth-switch-label').textContent=registering?'Already have an account?':'New here?';
 $('#auth-form').elements.password.autocomplete=registering?'new-password':'current-password';$('#auth-error').textContent='';
};
$('#auth-form').onsubmit=async event=>{
 event.preventDefault();const button=$('#auth-submit');button.disabled=true;$('#auth-error').textContent='';
 try{const data=Object.fromEntries(new FormData(event.target));if(!registering)delete data.name;
 const result=await api('/auth/'+(registering?'register':'login'),{method:'POST',body:JSON.stringify(data)});
 await enterWorkspace(result.user);event.target.reset();}catch(e){$('#auth-error').textContent=e.message;}finally{button.disabled=false;}
};
$('#demo-button').onclick=async()=>{
 const button=$('#demo-button');button.disabled=true;button.textContent='Preparing your workspace…';$('#auth-error').textContent='';
 try{const result=await api('/auth/register',{method:'POST',body:JSON.stringify({name:'Demo student',email:'demo-'+crypto.randomUUID()+'@example.com',password:crypto.randomUUID()+'Aa1!'})});
 await api('/faqs/sample',{method:'POST',body:'{}'});await enterWorkspace(result.user);toast('Your sample workspace is ready.');}
 catch(e){$('#auth-error').textContent=e.message;}finally{button.disabled=false;button.textContent='Open a sample workspace →';}
};
async function logout(){try{await api('/auth/logout',{method:'POST',body:'{}'});faqs=[];drafts=[];chat=[];sourceText='';currentPage='knowledge';filter='All';search='';showAuth();}catch(e){toast(e.message,true);}}
$('#logout').onclick=logout;$('#mobile-logout').onclick=logout;
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
function navigate(page){currentPage=page;render();}
function render(){
 $('#nav-count').textContent=faqs.length;document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===currentPage));
 $('#breadcrumb').textContent={knowledge:'Knowledge base',studio:'FAQ studio',assistant:'Test assistant'}[currentPage];
 if(currentPage==='knowledge')renderKnowledge();else if(currentPage==='studio')renderStudio();else renderAssistant();
}
function renderKnowledge(){
 $('#page-content').innerHTML=`<div class="page-heading"><div><h1>Your knowledge, organized.</h1><p>A home for every helpful answer. Keep it clear, keep it up to date.</p></div><div class="heading-actions"><button id="export" class="button secondary">↓ Export</button><button id="new-faq" class="button primary">+ Create FAQ</button></div></div>
 <div class="stats"><div class="stat"><span class="stat-icon">▤</span><div><small>Total FAQs</small><strong>${faqs.length}</strong><p class="stat-detail">Answers in your library</p></div></div><div class="stat"><span class="stat-icon">⌑</span><div><small>Categories</small><strong>${new Set(faqs.map(x=>x.category)).size}</strong><p class="stat-detail">A place for every topic</p></div></div><div class="stat"><span class="stat-icon">✦</span><div><small>Answer engine</small><strong class="engine-label">${health.aiEnabled?'Semantic':'Keyword'}</strong><p class="stat-detail">${health.aiEnabled?'AI embeddings enabled':'Offline demo · no key needed'}</p></div></div></div>
 <div class="tip-banner"><span class="spark">✦</span><div><h3>From a wall of text to a library of answers.</h3><p>Paste your content, review FAQ drafts, and save the ones you love.</p></div><button id="open-studio" class="text-button">Try FAQ studio ↗</button></div>
 <div class="toolbar"><div class="section-title">All answers <small id="result-count"></small></div><input id="filter-search" class="search-input" type="search" placeholder="Search your FAQs…" aria-label="Filter FAQs" value="${escapeHTML(search)}"></div>
 <div class="filter-row">${['All',...categories].map(x=>`<button class="filter ${filter===x?'active':''}" data-category="${x}">${x}</button>`).join('')}</div><div id="faq-grid" class="faq-grid"></div>`;
 $('#new-faq').onclick=()=>openEditor();$('#open-studio').onclick=()=>navigate('studio');
 $('#filter-search').oninput=e=>{search=e.target.value;renderCards();};
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{filter=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x.dataset.category===filter));renderCards();});
 $('#export').onclick=()=>{const data=faqs.map(({question,answer,category})=>({question,answer,category}));const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='faq-knowledge-base.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Knowledge base exported.');};renderCards();
}
function renderCards(){
 const visible=faqs.filter(x=>(filter==='All'||x.category===filter)&&(x.question+' '+x.answer).toLowerCase().includes(search.toLowerCase()));
 $('#result-count').textContent=visible.length+' FAQs';
 $('#faq-grid').innerHTML=visible.length?visible.map(x=>`<article class="faq-card"><div class="card-top"><span class="category ${x.category.toLowerCase()}">${escapeHTML(x.category)}</span><span class="muted" aria-hidden="true">↗</span></div><h3>${escapeHTML(x.question)}</h3><p class="answer-preview">${escapeHTML(x.answer)}</p><div class="card-bottom"><span>${x.source==='sample'?'Sample content':'Saved answer'} · ${new Date(x.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span><div class="card-actions"><button data-edit="${x.id}">Edit</button><button class="danger" data-delete="${x.id}">Delete</button></div></div></article>`).join(''):`<div class="empty"><span class="empty-icon">▤</span><h3>${faqs.length?'No answers found.':'Your first answer starts here.'}</h3><p>${faqs.length?'Try a different search or category.':'Create an FAQ, draft from your content, or load a sample library.'}</p>${!faqs.length?'<button id="load-samples" class="button primary">Load sample FAQs ↗</button>':''}</div>`;
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(faqs.find(x=>x.id===b.dataset.edit)));
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this FAQ? This removes it from your knowledge base.'))return;b.disabled=true;try{await api('/faqs/'+b.dataset.delete,{method:'DELETE'});await refreshFaqs();toast('FAQ deleted.');}catch(e){toast(e.message,true);b.disabled=false;}});
 if($('#load-samples'))$('#load-samples').onclick=async()=>{const b=$('#load-samples');b.disabled=true;try{await api('/faqs/sample',{method:'POST',body:'{}'});await refreshFaqs();toast('Six sample answers added.');}catch(e){toast(e.message,true);b.disabled=false;}};
}
async function refreshFaqs(){faqs=(await api('/faqs')).faqs;render();}
function openEditor(faq,index=null){
 const form=$('#faq-form');form.reset();draftIndex=index;form.elements.id.value=faq?.id||'';form.elements.question.value=faq?.question||'';form.elements.answer.value=faq?.answer||'';form.elements.category.value=faq?.category||'General';
 $('#dialog-title').textContent=faq?.id?'Edit your answer':index!==null?'Review & save draft':'Create an answer';$('#faq-error').textContent='';$('#faq-dialog').showModal();
}
$('#close-dialog').onclick=$('#cancel-dialog').onclick=()=>$('#faq-dialog').close();
$('#faq-form').onsubmit=async event=>{
 event.preventDefault();const b=event.target.querySelector('[type=submit]');b.disabled=true;$('#faq-error').textContent='';
 try{const {id,...data}=Object.fromEntries(new FormData(event.target));await api('/faqs'+(id?'/'+id:''),{method:id?'PUT':'POST',body:JSON.stringify(data)});if(draftIndex!==null)drafts.splice(draftIndex,1);$('#faq-dialog').close();await refreshFaqs();toast(id?'Answer updated.':'New answer saved.');}catch(e){$('#faq-error').textContent=e.message;}finally{b.disabled=false;}
};
const sampleText='Customers can request a refund within 14 days of purchase. Approved refunds take 5 to 7 business days. Standard delivery takes 3 to 5 business days. Express delivery takes 1 to 2 business days. To reset your password, click Forgot password on the customer portal login page and follow the email link. Support is available Monday to Friday, 9 AM to 6 PM. You can cancel your subscription from the Billing section of Account settings.';
function renderStudio(){
 $('#page-content').innerHTML=`<div class="page-heading"><div><h1>A starting point for every answer.</h1><p>Turn your policies, product notes, and support content into useful FAQs.</p></div><span class="pill">${health.aiEnabled?'AI GENERATION':'EXTRACTIVE DEMO'}</span></div><div class="studio-layout"><section class="panel"><h2>Bring your knowledge.</h2><p>Paste source text below. Drafts stay here until you review and save them.</p><form id="generate-form"><label>Source content<textarea id="source-text" required minlength="30" maxlength="20000" rows="11" placeholder="Paste a product description, return policy, or support document…">${escapeHTML(sourceText)}</textarea></label><div class="source-tools"><button type="button" id="sample-text" class="text-button">Use sample content ↗</button><span class="muted">30–20,000 characters</span></div><div class="studio-options"><label>Drafts to create<select id="draft-count">${[3,5,8].map(x=>`<option ${draftCount===x?'selected':''}>${x}</option>`).join('')}</select></label><button type="submit" class="button primary" id="generate-button" ${generating?'disabled':''}>${generating?'Creating drafts…':'✦ Generate drafts'}</button></div><p id="generate-error" class="error" role="alert"></p></form><div class="notice">${health.aiEnabled?'Your source text is sent to OpenAI to draft FAQs. Always review generated answers before saving.':'Demo mode extracts sentences and applies question templates. It is not generative AI. Add OPENAI_API_KEY in .env and restart to enable AI drafting and semantic search.'}</div></section><section class="panel"><h2>Review before you publish.</h2><p id="draft-description"></p><div id="draft-list"></div></section></div>`;
 $('#source-text').oninput=e=>sourceText=e.target.value;$('#draft-count').onchange=e=>draftCount=Number(e.target.value);$('#sample-text').onclick=()=>{sourceText=sampleText;$('#source-text').value=sourceText;};
 $('#generate-form').onsubmit=async event=>{
 event.preventDefault();if(generating)return;generating=true;const b=$('#generate-button');b.disabled=true;b.textContent='Creating drafts…';$('#generate-error').textContent='';
 try{const result=await api('/generate',{method:'POST',body:JSON.stringify({text:sourceText,count:draftCount})});drafts=result.drafts;if(currentPage==='studio')renderDrafts();toast(drafts.length?drafts.length+' drafts ready to review.':'No drafts found. Try content with specific facts.');}
 catch(e){if($('#generate-error'))$('#generate-error').textContent=e.message;else toast(e.message,true);}
 finally{generating=false;if($('#generate-button')){$('#generate-button').disabled=false;$('#generate-button').textContent='✦ Generate drafts';}}
 };renderDrafts();
}
function renderDrafts(){
 $('#draft-description').textContent=drafts.length?drafts.length+' drafts ready. Edit and save each answer.':'Your drafts will appear here.';
 $('#draft-list').innerHTML=drafts.length?drafts.map((x,i)=>`<article class="draft-card"><span class="category">${escapeHTML(x.category)}</span><h3>${escapeHTML(x.question)}</h3><p>${escapeHTML(x.answer)}</p><button class="button secondary" data-draft="${i}">Review & save ↗</button></article>`).join(''):'<div class="empty draft-empty"><span class="empty-icon">✦</span><h3>Good answers begin here.</h3><p>Add your source content and generate your first set of drafts.</p></div>';
 document.querySelectorAll('[data-draft]').forEach(b=>b.onclick=()=>openEditor(drafts[Number(b.dataset.draft)],Number(b.dataset.draft)));
}
function renderAssistant(){
 $('#page-content').innerHTML=`<div class="page-heading"><div><h1>Put your answers to the test.</h1><p>Ask a question and see what your knowledge base has to say.</p></div><button id="clear-chat" class="button secondary">Clear conversation</button></div><div class="assistant-layout"><section class="chat-panel"><div class="chat-head"><span class="chat-avatar">✦</span><div><strong>Knowledge assistant</strong><small>${health.aiEnabled?'Semantic search · AI embeddings':'Keyword search · offline demo'}</small></div></div><div id="chat-messages" class="chat-messages"></div><form id="chat-form" class="chat-form"><input id="chat-input" placeholder="Ask about your knowledge base…" minlength="2" maxlength="500" required aria-label="Your question"><button class="button primary" id="send-question" type="submit" aria-label="Send question">↑</button></form></section><aside class="assistant-aside"><h3>A few questions to try</h3><div class="suggestions"><button class="suggestion">How can I get my money back?</button><button class="suggestion">I forgot my password.</button><button class="suggestion">When will my order arrive?</button></div><div class="notice">Answers come from your saved FAQs. If there isn’t a reliable match, the assistant will say so.</div><h3>A note about matching</h3><p>${health.aiEnabled?'Embeddings compare the meaning of your question with the FAQs. Similarity is a ranking signal, not a probability of correctness.':'The demo matches words and a small synonym dictionary. Real embedding-based semantic search requires an AI API key.'}</p></aside></div>`;
 $('#clear-chat').onclick=()=>{chat=[];renderMessages();};$('#chat-form').onsubmit=e=>{e.preventDefault();ask($('#chat-input').value);};
 document.querySelectorAll('.suggestion').forEach(b=>b.onclick=()=>ask(b.textContent));renderMessages();
}
function renderMessages(){
 const e=$('#chat-messages');if(!e)return;
 e.innerHTML='<div class="message"><div class="message-label">FAQ ASSISTANT</div><div class="message-bubble">Hi! Ask me a question about your saved FAQs. I’ll find a relevant answer and show you where it came from.</div></div>'+chat.map(x=>`<div class="message ${x.role}"><div class="message-label">${x.role==='user'?'YOU':'FAQ ASSISTANT'}</div><div class="message-bubble">${escapeHTML(x.text)}</div>${x.source?`<span class="source-link">↳ Source: ${escapeHTML(x.source)}</span>`:''}</div>`).join('');
 e.scrollTop=e.scrollHeight;$('#send-question').disabled=chatBusy;$('#chat-input').disabled=chatBusy;$('#clear-chat').disabled=chatBusy;
}
async function ask(query){
 query=query.trim();if(query.length<2||chatBusy)return;chatBusy=true;chat.push({role:'user',text:query});$('#chat-input').value='';renderMessages();
 try{const result=await api('/search',{method:'POST',body:JSON.stringify({query})});chat.push({role:'assistant',text:result.answer,source:result.source?.question});}
 catch(e){chat.push({role:'assistant',text:e.message});}finally{chatBusy=false;renderMessages();if(currentPage==='assistant'&&$('#chat-input'))$('#chat-input').focus();}
}
async function init(){try{health=await api('/health');try{const result=await api('/auth/me');await enterWorkspace(result.user);}catch{showAuth();}}catch{$('#auth-error').textContent='The server is not available. Start the project and refresh this page.';$('#demo-button').disabled=true;$('#auth-submit').disabled=true;}}init();


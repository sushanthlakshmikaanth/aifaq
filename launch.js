import 'dotenv/config';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
const url='http://127.0.0.1:'+port;
async function ready(){
 try{const response=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)});const data=await response.json();return data.app==='ai-faq-assistant';}catch{return false;}
}
function open(){
 if(process.platform==='win32')spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});
 console.log('Open '+url+' in your browser. Keep the server window open during your demo.');
}
if(await ready()){
 console.log('The project is already running. To change database or AI settings, stop the existing server first.');open();
}else{
 const child=spawn(process.execPath,['src/server.js'],{cwd:root,env:process.env,stdio:'inherit'});
 let exited=false;
 child.on('exit',code=>{exited=true;process.exitCode=code||0;});
 child.on('error',error=>{exited=true;console.error(error.message);process.exitCode=1;});
 console.log('Starting your workspace. The first MongoDB run may download a database binary.');
 for(let i=0;i<180&&!exited;i++){
  if(await ready()){open();break;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 process.on('SIGINT',()=>child.kill('SIGINT'));
}


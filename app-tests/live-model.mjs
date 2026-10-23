import { writeFile } from 'node:fs/promises';
const cases = [
  { name:'invoice request', text:'Please send the invoice.', persona:'executive',formality:5,verbosity:2,enthusiasm:1 },
  { name:'ordinary bugs', text:'I found a few bugs in the search filter. Can you review them tomorrow?',persona:'legal',formality:5,verbosity:3,enthusiasm:1 },
  { name:'deadline and amount',text:'Please send the revised invoice for INR 12,500 by 25 October at 3:00 PM. Do not charge the extra INR 500.',persona:'executive',formality:5,verbosity:2,enthusiasm:1 },
  { name:'mixed language',text:'Kal ki meeting 4:30 PM par shift kar do please. Budget INR 8,000 hi rakhna, extra payment approve nahi hai.',persona:'supportive',formality:2,verbosity:3,enthusiasm:3 },
  { name:'casual unfamiliar',text:'I cannot attend the rehearsal on Friday. Please share the recording and keep my registration active.',persona:'genz',formality:1,verbosity:2,enthusiasm:4 },
  { name:'same meaning warmer fuller',text:'I cannot attend the rehearsal on Friday. Please share the recording and keep my registration active.',persona:'supportive',formality:4,verbosity:5,enthusiasm:4 },
];
const results=[];
for(const item of cases){
  const start=Date.now();
  try {
    const response=await fetch('http://127.0.0.1:5173/api/rewrite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item),signal:AbortSignal.timeout(125000)});
    const result=await response.json();
    results.push({ ...item,status:response.status,result,elapsedMs:Date.now()-start });
  }catch(error){results.push({...item,error:error.message,elapsedMs:Date.now()-start});}
  console.log(JSON.stringify(results.at(-1)));
}
await writeFile(new URL('../docs/local-model-results.json',import.meta.url),JSON.stringify({runAt:new Date().toISOString(),model:'qwen3:4b',modelRequests:cases.length,results},null,2));
if(results.some(r=>r.status!==200)) process.exitCode=1;

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp, configuration, validateInput, validateOutput, messagesFor, generate } from '../server.mjs';
const input = { text: 'Please send the invoice for INR 12,500 by 25 October.', persona: 'executive', formality: 5, verbosity: 2, enthusiasm: 1 };
test('validates message, persona and bounded integer tones', () => {
  assert.equal(validateInput(input).text, input.text);
  for (const bad of [{...input,text:''},{...input,text:'x'.repeat(1201)},{...input,persona:'unknown'},{...input,verbosity:1.5},{...input,formality:6},{...input,text:'!!!'}]) assert.throws(() => validateInput(bad));
});
test('all personas and tone settings enter instructions, source is data', () => {
  for (const persona of ['executive','supportive','legal','genz']) {
    const messages = messagesFor({...input,persona});
    assert.match(messages[0].content,/Formality 5\/5/);
    assert.match(messages[0].content,/Verbosity 2\/5/);
    assert.equal(JSON.parse(messages.at(-1).content).message_to_rewrite,input.text);
  }
});
test('rejects changed facts and obvious role/severity drift', () => {
  assert.throws(()=>validateOutput({text:'Please send INR 15,000 by 25 October.',subject:'Invoice'},input),/changed a number/);
  assert.throws(()=>validateOutput({text:"I'll send the invoice for INR 12,500 by 25 October.",subject:'Invoice'},input),/request into a promise/);
  assert.throws(()=>validateOutput({text:'We found critical bugs.',subject:'Bugs'},{text:'We found bugs.'}),/severity/);
  assert.equal(validateOutput({text:'Kindly send the invoice for INR 12,500 by 25 October.',subject:'Invoice request'},input).subject,'Invoice request');
  assert.throws(()=>validateOutput({text:input.text,subject:'Invoice'},input),/unchanged/);
  assert.throws(()=>validateOutput({text:'Please review it by tomorrow.',subject:'Review'},{text:'Review it tomorrow.'}),/deadline/);
  assert.throws(()=>validateOutput({text:'Please maintain my registration status.',subject:'Registration'},{text:'Keep my registration active.'}),/active state/);
  assert.throws(()=>validateOutput({text:'Please share the notes.',subject:'Meeting cancellation'},{text:'Send the notes.'}),/cancellation/);
});
test('Ollama config stays local and OpenAI remains explicit', () => {
  assert.equal(configuration({}).model,'qwen3:4b');
  assert.throws(()=>configuration({OLLAMA_URL:'https://example.com'}),/local HTTP/);
  assert.throws(()=>configuration({AI_PROVIDER:'bad'}));
  assert.equal(configuration({PUBLIC_ORIGIN:'https://demo.trycloudflare.com'}).publicOrigin,'https://demo.trycloudflare.com');
  assert.throws(()=>configuration({PUBLIC_ORIGIN:'http://demo.trycloudflare.com'}),/HTTPS origin/);
  assert.throws(()=>configuration({PUBLIC_ORIGIN:'https://demo.trycloudflare.com/path'}),/HTTPS origin/);
});
test('provider sends JSON schema and no thinking; validates reply', async () => {
  let sent;
  const output=await generate(input,configuration({}),new AbortController().signal,async(url,options)=>{ sent=JSON.parse(options.body); return {ok:true,json:async()=>({message:{content:JSON.stringify({text:'Kindly send the invoice for INR 12,500 by 25 October.',subject:'Invoice request'})}})}; });
  assert.equal(sent.think,false); assert.equal(sent.stream,false); assert.equal(output.provider,'ollama');
});
test('HTTP boundary blocks secrets, invalid requests and cross-origin requests', async t => {
  const server=createApp({config:configuration({PUBLIC_ORIGIN:'https://demo.trycloudflare.com'}),fetchImpl:async()=>({ok:true,json:async()=>({models:[{name:'qwen3:4b'}]})})});
  server.listen(0,'127.0.0.1'); await once(server,'listening'); t.after(()=>server.close());
  const url=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(url+'/api/status').then(r=>r.json())).ready,true);
  for (const path of ['/.env','/.ai-analytics/REPORT.md','/server.mjs','/../AGENTS.md']) assert.equal((await fetch(url+path)).status,404);
  assert.equal((await fetch(url+'/api/rewrite',{method:'POST',headers:{'Content-Type':'application/json'},body:'broken'})).status,400);
  assert.equal((await fetch(url+'/api/rewrite',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://demo.trycloudflare.com'},body:'broken'})).status,400);
  assert.equal((await fetch(url+'/api/rewrite',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify(input)})).status,403);
});
test('browser disconnect cancels upstream generation', async t => {
  let entered, aborted;
  const began=new Promise(r=>entered=r), stopped=new Promise(r=>aborted=r);
  const server=createApp({config:configuration({}),fetchImpl:async(_url,options)=>{ entered(); return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted();reject(new Error('cancelled'));},{once:true})); }});
  server.listen(0,'127.0.0.1'); await once(server,'listening'); t.after(()=>server.close());
  const controller=new AbortController();
  const response=fetch(`http://127.0.0.1:${server.address().port}/api/rewrite`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal}).catch(()=>null);
  await began; controller.abort(); await response;
  await Promise.race([stopped,new Promise((_r,reject)=>setTimeout(()=>reject(new Error('Upstream not cancelled')),1000))]);
});

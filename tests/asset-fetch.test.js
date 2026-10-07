import test from 'node:test';
import assert from 'node:assert/strict';
import {json,bytes} from '../src/rendering/asset-fetch.js';
import {assetUrl} from '../src/rendering/asset-url.js';

test('JSON transport resolves compressed resources and nested asset URLs and forwards cancellation',async t=>{
 const options={signal:new AbortController().signal},calls=[];
 t.mock.method(globalThis,'fetch',async(...args)=>{calls.push(args);return{ok:true,json:async()=>({nested:[{url:'/content/sfx.json'},7,null]})};});
 const result=await json('/content/sfx.json',options);
 assert.deepEqual(calls,[[assetUrl('/content/sfx.json'),options]]);
 assert.deepEqual(result,{nested:[{url:assetUrl('/content/sfx.json')},7,null]});
});
test('binary transport retains exact bytes and the omitted-options fetch call shape',async t=>{
 const data=Uint8Array.of(0,1,127,255).buffer,calls=[];
 t.mock.method(globalThis,'fetch',async(...args)=>{calls.push(args);return{ok:true,arrayBuffer:async()=>data};});
 assert.equal(await bytes('/content/sfx.json'),data);assert.deepEqual(calls,[[assetUrl('/content/sfx.json')]]);
});
test('both transports propagate network/abort and reject non-OK responses before reading a body',async t=>{
 for(const get of [json,bytes]){
  const abort=new DOMException('aborted','AbortError');
  const fetch=t.mock.method(globalThis,'fetch',async()=>{throw abort;});await assert.rejects(get('/missing'),error=>error===abort);
  fetch.mock.mockImplementation(async()=>({ok:false,json:()=>assert.fail('body read'),arrayBuffer:()=>assert.fail('body read')}));
  await assert.rejects(get('/missing'),/No se pudo cargar \/missing/);fetch.mock.restore();
 }
});

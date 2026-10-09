import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/music-cache-sw.js',import.meta.url),'utf8');
function fixture(network=async()=>new Response('network'),{storageError,matchError}={}){
  const entries=new Map(),listeners={},fetches=[],cache={async match(key){return entries.get(key)?.clone();},async put(key,response){entries.set(key,new Response(await response.blob(),{status:response.status,headers:response.headers}));}};
  if(matchError)cache.match=async()=>{throw matchError;};
  runInNewContext(source,{self:{location:{origin:'https://game.example'},addEventListener(type,fn){listeners[type]=fn;}},caches:{open:async()=>{if(storageError)throw storageError;return cache;}},fetch:async request=>{fetches.push(request);return network(request);},URL,Response,Headers,Map,Number});
  async function request(url,{range,destination='audio'}={}){
    const waits=[],event={request:{url,method:'GET',destination,headers:new Headers(range?{Range:range}:{})},waitUntil(promise){waits.push(promise);},respondWith(promise){this.response=promise;}};
    listeners.fetch(event);const response=await event.response;await Promise.all(waits);return response;
  }
  return {entries,fetches,cache,request};
}
test('stored compressed media serves an exact byte range without network or PCM conversion',async()=>{
  const f=fixture();await f.cache.put('https://game.example/assets/music.mp3',new Response('0123456789',{headers:{'Content-Type':'audio/mpeg'}}));
  const response=await f.request('https://game.example/assets/music.mp3?music-cache-only=1',{range:'bytes=3-6'});
  assert.equal(response.status,206);assert.equal(await response.text(),'3456');assert.equal(response.headers.get('Content-Range'),'bytes 3-6/10');assert.equal(response.headers.get('Content-Length'),'4');assert.equal(f.fetches.length,0);
  const suffix=await f.request('https://game.example/assets/music.mp3',{range:'bytes=-2'});assert.equal(await suffix.text(),'89');
  const rest=await f.request('https://game.example/assets/music.mp3',{range:'bytes=8-'});assert.equal(await rest.text(),'89');
});
test('missing offline audio fails without silently accessing the network',async()=>{
  const f=fixture();const response=await f.request('https://game.example/assets/missing.mp3?music-cache-only=1');assert.equal(response.status,503);assert.equal(f.fetches.length,0);
});
test('first ranged playback passes through immediately and stores the complete compressed file',async()=>{
  const f=fixture(async request=>typeof request==='string'?new Response('0123456789',{headers:{'Content-Type':'audio/mpeg'}}):new Response('01',{status:206}));
  const first=await f.request('https://game.example/assets/music.mp3',{range:'bytes=0-1'});assert.equal(await first.text(),'01');assert.equal(f.fetches.length,2);
  const offline=await f.request('https://game.example/assets/music.mp3?music-cache-only=1',{range:'bytes=6-9'});assert.equal(await offline.text(),'6789');assert.equal(f.fetches.length,2);
});
test('invalid or out-of-bounds ranges fail instead of returning an incorrect media segment',async()=>{
  const f=fixture();await f.cache.put('https://game.example/music.mp3',new Response('0123456789'));
  for(const range of ['bytes=10-','bytes=6-4','bytes=-0','bytes=','bytes=0-1,4-5']){const response=await f.request('https://game.example/music.mp3',{range});assert.equal(response.status,416);assert.equal(response.headers.get('Content-Range'),'bytes */10');}
});
test('a first range spanning the full file is cached without downloading it twice',async()=>{
  const f=fixture(async()=>new Response('0123456789',{status:206,headers:{'Content-Range':'bytes 0-9/10','Content-Type':'audio/mpeg'}}));
  await f.request('https://game.example/music.mp3',{range:'bytes=0-'});assert.equal(f.fetches.length,1);
  const offline=await f.request('https://game.example/music.mp3?music-cache-only=1',{range:'bytes=4-6'});assert.equal(await offline.text(),'456');assert.equal(f.fetches.length,1);
});
test('SFX fetches, non-audio assets and cross-origin media are not intercepted',async()=>{
  const f=fixture();assert.equal(await f.request('https://game.example/assets/sfx.mp3',{destination:''}),undefined);assert.equal(await f.request('https://game.example/assets/model.glb',{destination:'fetch'}),undefined);assert.equal(await f.request('https://other.example/music.mp3'),undefined);assert.equal(f.fetches.length,0);
});
for(const operation of ['storageError','matchError']){
 test(`unavailable ${operation} preserves the original streaming range request`,async()=>{
  const f=fixture(async request=>new Response(request.headers.get('Range'),{status:206}),{[operation]:Error('denied')});
  const response=await f.request('https://game.example/music.opus',{range:'bytes=2-4'});
  assert.equal(response.status,206);assert.equal(await response.text(),'bytes=2-4');assert.equal(f.fetches.length,1);
  assert.equal(f.fetches[0].url,'https://game.example/music.opus');
 });
 test(`offline request never accesses the network after ${operation}`,async()=>{
  const f=fixture(async()=>{throw Error('must remain offline');},{[operation]:Error('denied')});
  const response=await f.request('https://game.example/music.opus?music-cache-only=1',{range:'bytes=2-4'});
  assert.equal(response.status,503);assert.equal(f.fetches.length,0);
 });
}
test('network failure after storage denial propagates without duplicate downloads',async()=>{
 const f=fixture(async()=>{throw Error('network down');},{storageError:Error('denied')});
 await assert.rejects(f.request('https://game.example/music.opus',{range:'bytes=2-4'}),/network down/);
 assert.equal(f.fetches.length,1);
});

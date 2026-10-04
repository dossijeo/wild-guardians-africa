import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function fixture(resources){
 const audio=new AudioSystem({sfx:1,music:1},resources),sources=[],gains=[];
 audio.context={state:'running',currentTime:1,destination:{},async resume(){},createGain(){const g={gain:{value:0},connect(){},disconnect(){this.closed=true;}};gains.push(g);return g;},createBufferSource(){const s={playbackRate:{value:0},connect(){},disconnect(){this.closed=true;},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(s);return s;},async decodeAudioData(data){return data;}};
 audio.sfxGain={gain:{value:1}};audio.musicGain={gain:{value:1}};return {audio,sources,gains};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const bank=name=>({duration:10,tracks:[{data:{url:name}}]});

test('leaving during menu JSON cannot start or decode stale music',async()=>{
 const data=deferred();let decoded=0;const {audio,sources}=fixture({json:()=>data.promise,bytes:async()=>{decoded++;return {};}});
 const pending=audio.menu();await settle();audio.stop();data.resolve({music:'menu.mp3'});await pending;assert.equal(decoded,0);assert.equal(sources.length,0);
});

test('leaving during audio unlock cannot stop the newly selected scene or fetch old menu',async()=>{
 const unlocking=deferred();let fetched=0;const {audio}=fixture({json:async()=>{fetched++;return {};}});audio.unlock=()=>unlocking.promise;
 const pending=audio.menu();audio.stop();audio.pack='b';const generation=audio.generation;unlocking.resolve();await pending;assert.equal(fetched,0);assert.equal(audio.generation,generation);assert.equal(audio.pack,'b');
});

test('late pack A loading and rejection cannot start A or stop the newer B stems',async()=>{
 for(const rejectOld of [false,true]){
  const old=deferred();const {audio,sources}=fixture({json:async url=>url.includes('music-a')?old.promise:bank('B'),bytes:async url=>({url})});audio.sfx={items:[]};
  const a=audio.gameplay(1);await settle();await audio.gameplay(2);assert.equal(audio.pack,'b');assert.equal(sources.length,1);assert.equal(sources[0].buffer.url,'B');
  if(rejectOld){old.reject(new Error('old A failed'));await assert.rejects(a,/old A failed/);}else{old.resolve(bank('A'));await a;}
  assert.equal(audio.pack,'b');assert.equal(audio.active.length,1);assert.equal(sources[0].stopped,undefined);assert.equal(sources.length,1);
 }
});

test('failed network and failed decoder caches are evicted and one later request can retry',async()=>{
 let loads=0,decodes=0;const {audio}=fixture({bytes:async()=>{loads++;if(loads===1)throw new Error('missing asset');return {};}});
 audio.context.decodeAudioData=async data=>{decodes++;if(decodes===1)throw new Error('invalid MP3');return data;};
 await assert.rejects(Promise.all(Array.from({length:10},()=>audio.buffer('retry.mp3'))),/missing asset/);assert.equal(loads,1);assert.equal(audio.buffers.has('retry.mp3'),false);
 await assert.rejects(audio.buffer('retry.mp3'),/invalid MP3/);assert.equal(audio.buffers.has('retry.mp3'),false);
 assert.deepEqual(await audio.buffer('retry.mp3'),{});assert.equal(loads,3);assert.equal(decodes,2);
});

test('failed SFX catalogue is coalesced, released and retryable',async()=>{
 let loads=0;const {audio}=fixture({json:async()=>{loads++;if(loads===1)throw new Error('missing bank');return {items:[]};}});
 await assert.rejects(Promise.all(Array.from({length:10},()=>audio.sfxBank())),/missing bank/);assert.equal(loads,1);assert.equal(audio.sfxPromise,null);
 assert.deepEqual(await audio.sfxBank(),{items:[]});assert.equal(loads,2);
});

test('failed stem allows same-day retry and partial playback start is cleaned up',async()=>{
 let failed=true,failStart=false;const {audio,sources,gains}=fixture({json:async()=>({duration:10,tracks:[{data:{url:'stem-1'}},{data:{url:'stem-2'}}]}),bytes:async url=>{if(url==='stem-2'&&failed)throw new Error('missing stem');return {url};}});audio.sfx={items:[]};
 await assert.rejects(audio.gameplay(1),/missing stem/);assert.equal(audio.pack,null);assert.equal(sources.length,0);
 failed=false;const create=audio.context.createBufferSource;audio.context.createBufferSource=()=>{const source=create();if(failStart&&sources.length===2)source.start=()=>{throw new Error('start failed');};return source;};
 failStart=true;await assert.rejects(audio.gameplay(1),/start failed/);assert.equal(audio.pack,null);assert.equal(audio.active.length,0);assert.ok(sources[0].stopped&&sources[0].closed);assert.ok(gains.every(g=>g.closed));
 failStart=false;await audio.gameplay(1);assert.equal(audio.pack,'a');assert.equal(audio.active.length,2);
});

test('suspending during decode does not falsely mark an inaudible pack as playing',async()=>{
 const decoding=deferred();const {audio,sources}=fixture({json:async()=>bank('A'),bytes:async()=>({})});audio.sfx={items:[]};audio.context.decodeAudioData=()=>decoding.promise;
 const pending=audio.gameplay(1);await settle();audio.context.state='suspended';decoding.resolve({});await pending;assert.equal(audio.pack,null);assert.equal(sources.length,0);
 audio.context.state='running';await audio.gameplay(1);assert.equal(audio.active.length,1);assert.equal(audio.pack,'a');
});

test('twenty menu enter/exit cycles release all source and volume nodes',async()=>{
 const {audio,sources,gains}=fixture({json:async()=>({music:'menu'}),bytes:async()=>({})});
 for(let i=0;i<20;i++){await audio.menu();assert.equal(audio.active.length,1);audio.stop();assert.equal(audio.active.length,0);assert.equal(audio.voices.size,0);}
 assert.equal(sources.length,20);assert.ok(sources.every(s=>s.stopped&&s.closed));const buses=Object.values(audio.sfxBuses);assert.equal(buses.length,3);assert.ok(buses.every(g=>!g.closed));assert.ok(gains.filter(g=>!buses.includes(g)).every(g=>g.closed));
});


test('a rejected resume leaves audio idle and the next gesture can unlock the same context',async()=>{
 const {audio,sources}=fixture({});let attempts=0;const original=audio.context;audio.context.state='suspended';
 audio.context.resume=async()=>{if(++attempts===1)throw new Error('gesture required');audio.context.state='running';};
 await assert.rejects(audio.unlock(),/gesture required/);assert.equal(audio.active.length,0);assert.equal(sources.length,0);
 await audio.unlock();assert.equal(audio.context,original);assert.equal(audio.context.state,'running');assert.equal(attempts,2);
});

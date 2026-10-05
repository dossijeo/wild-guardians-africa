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

const tenStems=name=>({duration:10,tracks:Array.from({length:10},(_,i)=>({data:{url:name+i}}))});
test('switching while music fetches discards eight queued old stems and skips obsolete decoding',async()=>{
 const oldFetches=[],fetched=[],decoded=[];
 const {audio,sources}=fixture({json:async url=>tenStems(url.includes('music-a')?'A':'B'),bytes:async url=>{
  fetched.push(url);if(url.startsWith('A')){const wait=deferred();oldFetches.push({url,wait});return wait.promise;}return {url};
 }});audio.sfx={items:[]};let active=0,peak=0;
 audio.context.decodeAudioData=async data=>{decoded.push(data.url);peak=Math.max(peak,++active);await settle();active--;return data;};
 const a=audio.gameplay(1);await settle();assert.equal(oldFetches.length,2);
 const b=audio.gameplay(2);await settle();assert.equal(fetched.length,2);
 for(const {url,wait} of oldFetches)wait.resolve({url});await Promise.all([a,b]);
 assert.equal(fetched.filter(url=>url.startsWith('A')).length,2);assert.equal(decoded.filter(url=>url.startsWith('A')).length,0);
 assert.equal(decoded.length,10);assert.equal(peak,2);assert.equal(sources.length,10);assert.ok(sources.every(s=>s.buffer.url.startsWith('B')));
 assert.ok([...audio.buffers.keys()].every(url=>url.startsWith('B')));audio.stop();
});

test('already running music decodes share the two-job limit with the replacement pack',async()=>{
 const oldDecodes=[],fetched=[],decoded=[];
 const {audio,sources}=fixture({json:async url=>tenStems(url.includes('music-a')?'A':'B'),bytes:async url=>{fetched.push(url);return {url};}});audio.sfx={items:[]};let active=0,peak=0;
 audio.context.decodeAudioData=async data=>{
  decoded.push(data.url);peak=Math.max(peak,++active);
  if(data.url.startsWith('A')){const wait=deferred();oldDecodes.push(wait);await wait.promise;}else await settle();active--;return data;
 };
 const a=audio.gameplay(1);await settle();assert.equal(oldDecodes.length,2);
 const b=audio.gameplay(2);await settle();assert.equal(fetched.length,2);
 oldDecodes.forEach(wait=>wait.resolve());await Promise.all([a,b]);
 assert.equal(decoded.filter(url=>url.startsWith('A')).length,2);assert.equal(decoded.filter(url=>url.startsWith('B')).length,10);
 assert.equal(peak,2);assert.equal(sources.length,10);assert.ok(sources.every(s=>s.buffer.url.startsWith('B')));audio.stop();
});

test('a cancelled music fetch is evicted without poisoning a later request for the same URL',async()=>{
 const data=deferred();let current=true,attempts=0,decoded=0;
 const {audio}=fixture({bytes:async()=>++attempts===1?data.promise:{new:true}});
 audio.context.decodeAudioData=async bytes=>{decoded++;return bytes;};
 const first=audio.buffer('same',{current:()=>current});await settle();current=false;data.resolve({old:true});
 assert.equal(await first,null);assert.equal(decoded,0);assert.equal(audio.buffers.has('same'),false);
 assert.deepEqual(await audio.buffer('same'),{new:true});assert.equal(decoded,1);
});

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


test('pack switching preserves active world/UI/ambient voices and pending SFX decode',async()=>{
 const delayed=deferred();const {audio,sources}=fixture({json:async url=>bank(url.includes('music-a')?'A':'B'),bytes:async url=>url==='pending'?delayed.promise:{url}});audio.sfx={items:[]};
 const world=audio.startBuffer({}, {family:'watering',emitter:'worker',bus:'world'}),ui=audio.startBuffer({}, {bus:'ui'}),ambient=audio.startBuffer({}, {loop:true,bus:'ambient'});
 const pending=audio.play('pending',{family:'hit'});await settle();await audio.gameplay(1);const a=sources.at(-1),generation=audio.generation;await audio.gameplay(2);delayed.resolve({url:'pending'});const hit=await pending;
 assert.equal(audio.generation,generation);assert.ok(hit);assert.ok(a.stopped);assert.ok([world,ui,ambient,hit].every(s=>!s.stopped));assert.equal(audio.active.length,5);assert.equal(audio.pack,'b');audio.stop();
});
test('decoded pack cache retains only current music and preserves reusable SFX',async()=>{
 const {audio}=fixture({json:async url=>bank(url.includes('music-a')?'A':'B'),bytes:async url=>({url})});audio.sfx={items:[]};await audio.buffer('SFX');
 await audio.gameplay(1);assert.ok(audio.buffers.has('A'));await audio.gameplay(2);assert.ok(!audio.buffers.has('A'));assert.ok(audio.buffers.has('B')&&audio.buffers.has('SFX'));audio.stopMusic();assert.ok(!audio.buffers.has('B'));assert.ok(audio.buffers.has('SFX'));assert.equal(audio.musicBuffers.size,0);
});
test('automatic daily selection coalesces frames, changes without a gesture and preserves results',async()=>{
 let requests=0;const {audio,sources}=fixture({json:async url=>{requests++;return bank(url.includes('music-a')?'A':'B');},bytes:async url=>({url})});audio.sfx={items:[]};const state={day:1,time:0,pauses:[],workers:[],spells:[]};
 for(let frame=0;frame<100;frame++)audio.updateMusic(state);await settle();assert.equal(requests,1);assert.equal(audio.pack,'a');state.day=2;for(let frame=0;frame<100;frame++)audio.updateMusic(state);await settle();assert.equal(requests,2);assert.equal(audio.pack,'b');assert.equal(audio.active.length,1);assert.ok(sources[0].stopped);
 state.day=3;state.result='defeat';audio.updateMusic(state);await settle();assert.equal(requests,2);assert.equal(audio.pack,'b');audio.stop();
});
test('automatic retry is bounded and a failed pack does not stop world effects',async()=>{
 let requests=0,fail=true;const {audio}=fixture({json:async()=>{requests++;if(fail)throw Error('offline');return bank('A');},bytes:async()=>({})});audio.sfx={items:[]};const source=audio.startBuffer({}, {family:'watering'}),state={day:1,time:0,workers:[],pauses:[],spells:[]};
 audio.updateMusic(state);await settle();assert.equal(requests,1);assert.equal(audio.pack,null);assert.equal(source.stopped,undefined);assert.match(audio.musicError.message,/offline/);
 for(let frame=0;frame<100;frame++)audio.updateMusic(state);await settle();assert.equal(requests,1);audio.context.currentTime+=2;fail=false;audio.updateMusic(state);await settle();assert.equal(requests,2);assert.equal(audio.pack,'a');assert.equal(audio.musicError,null);audio.stop();
});
test('old menu JSON and old decoded music cannot survive a music-only transition',async()=>{
 const menu=deferred();const {audio,sources}=fixture({json:async url=>url.includes('menu')?menu.promise:bank('B'),bytes:async url=>({url})});audio.sfx={items:[]};const request=audio.menu();await settle();await audio.gameplay(2);menu.resolve({music:'menu'});await request;assert.equal(sources.length,1);assert.equal(audio.pack,'b');
 const decode=deferred();audio.buffer=()=>decode.promise;const old=audio.play('old',{music:true});audio.stopMusic();decode.resolve({});assert.equal(await old,null);assert.equal(audio.active.length,0);
});
test('music transport failure releases only music and retains pending result feedback',()=>{
 const {audio}=fixture({});const world=audio.startBuffer({}, {family:'hit'}),music=audio.startBuffer({}, {music:true});audio.musicEvent='failure';audio.transport={update(){throw Error('transport fault');},dispose(){}};
 audio.updateMusic({result:'defeat',time:0,workers:[],pauses:[],spells:[]});assert.ok(music.stopped);assert.equal(world.stopped,undefined);assert.equal(audio.musicEvent,'failure');assert.match(audio.musicError.message,/transport fault/);assert.equal(audio.pack,null);audio.stop();
});


test('repeated menu gestures share one pending load and preserve the active original player',async()=>{
 const json=deferred();let requests=0,decoded=0;const {audio,sources}=fixture({json:async()=>{requests++;return json.promise;},bytes:async()=>{decoded++;return {};}});
 const first=audio.menu();await settle();await Promise.all(Array.from({length:20},()=>audio.menu()));assert.equal(requests,1);json.resolve({music:'menu'});await first;const source=sources[0];assert.equal(decoded,1);
 await Promise.all(Array.from({length:20},()=>audio.menu()));assert.equal(requests,1);assert.equal(decoded,1);assert.equal(sources.length,1);assert.equal(source.stopped,undefined);audio.stop();assert.equal(audio.menuActive,false);await audio.menu();assert.equal(requests,2);assert.equal(decoded,2);audio.stop();
});
test('a failed menu request is retryable without retaining a false active player',async()=>{
 let fail=true;const {audio}=fixture({json:async()=>{if(fail)throw Error('menu offline');return {music:'menu'};},bytes:async()=>({})});await assert.rejects(audio.menu(),/menu offline/);assert.equal(audio.menuActive,false);fail=false;await audio.menu();assert.equal(audio.menuActive,true);assert.equal(audio.active.length,1);audio.stop();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioSystem} from '../src/audio/audio.js';
import {MusicWindowPool} from '../src/audio/music-window-pool.js';
import {MusicWindowTransport} from '../src/audio/music-window-transport.js';
import {MUSIC_POLICIES} from '../src/audio/music-policy.js';
const banks=Object.fromEntries(['a','b'].map(pack=>[pack,JSON.parse(readFileSync(new URL(`../public/content/music-${pack}.json`,import.meta.url)))]));
const indices=Object.fromEntries(['a','b'].map(pack=>[pack,JSON.parse(readFileSync(new URL(`../public/content/music-windows-${pack}.json`,import.meta.url)))]));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(pack,{offset=0,random=()=>1,scene='day',beforeRead,windowIndex=indices[pack],mixerRandom}={}){
 const sources=[],decoded=[],gains=[],index=windowIndex,bank=banks[pack],audio=new AudioSystem({sfx:0,music:0});
 audio.context={state:'running',currentTime:1,createGain(){const node={gain:{setValueAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(){}},connect(){},disconnect(){this.closed=true;}};gains.push(node);return node;},createBufferSource(){const source={playbackRate:{value:0},connect(){},disconnect(){this.closed=true;},start(when,offset){this.when=when;this.offset=offset;},stop(at){this.stopAt=at??-Infinity;}};sources.push(source);return source;}};
 audio.musicGain={};audio.musicScene=scene;
 audio.musicWindowPool=new MusicWindowPool(index,{readRange:async(url,start)=>{await beforeRead?.(url,start);return {url,start};},decode:async data=>{
  const track=index.tracks.find(t=>t.url===data.url),window=track.windows.find(w=>w.startByte===data.start);decoded.push(track.id);
  return {length:window.decodedSamples,numberOfChannels:2,sampleRate:48000};
 }});
 const pool=audio.musicWindowPool;
 await Promise.all(bank.tracks.filter((t,i)=>MUSIC_POLICIES[pack].levels[scene][i]>0).map(t=>pool.load(t.id,pool.at(t.id,offset).window)));
 const transport=new MusicWindowTransport(audio,pack,bank,bank.tracks.map(track=>({track})),{offset,random});audio.transport=transport;
 if(mixerRandom)transport.mixer.random=mixerRandom;
 async function tick(now,next=scene){
  audio.context.currentTime=now;
  // Native ended also fires after stopVoice removes a source from audio.active.
  for(const source of sources)if(!source.nativeEnded&&source.stopAt<=now){source.nativeEnded=true;source.onended?.();}
  transport.update(next,now);await settle();await settle();transport.update(next,now);
 }
 await tick(1);return {audio,transport,pool,sources,gains,decoded,tick};
}
for(const pack of ['a','b']){
 test(`${pack}: silent stems have no PCM and every window uses the shared source position`,async()=>{
  const {audio,transport,pool,sources,decoded,tick}=await fixture(pack);transport.mixer.automatic=false;
  for(let now=1;now<25;now+=.1)await tick(now);
  const silent=MUSIC_POLICIES[pack].levels.day.flatMap((gain,i)=>gain===0?['s'+i]:[]);
  assert.ok(silent.every(id=>!decoded.includes(id)));assert.ok(sources.length>16);
  for(const source of sources)assert.ok(Math.abs(source.musicWindowFirstSample/48000+source.offset-(source.musicDeckOffset+source.when-source.musicDeckStart))<1e-10);
  assert.ok(pool.pcmBytes()<80*1024*1024);audio.stop();assert.equal(pool.pcmBytes(),0);assert.equal(audio.active.length,0);assert.ok(sources.every(source=>source.closed));
 });
 test(`${pack}: all original registered edges retain target, preroll and shared deck fade`,async()=>{
  const bank=banks[pack];
  for(const edge of bank.navigation.edges){
   const from=bank.navigation.sections.find(s=>s.id===edge.source),target=bank.navigation.sections.find(s=>s.id===edge.target);
   const {audio,transport,tick}=await fixture(pack,{offset:from.end-6,random:()=>0});
   for(let now=1;now<7.3;now+=.05)await tick(now);
   assert.equal(transport.lastEdge,edge.id);assert.equal(transport.section.id,target.id);
   assert.ok(Math.abs(transport.primary.offset-(target.start-.1))<1e-10);assert.ok(Math.abs(transport.primary.start-7)<1e-9);audio.stop();
  }
 });
 test(`${pack}: wrap and natural section navigation preserve the original transport`,async()=>{
  const bank=banks[pack],{audio,transport,tick}=await fixture(pack,{offset:bank.duration-8});
  for(let now=1;now<10;now+=.05)await tick(now);
  assert.equal(transport.loops,1);assert.equal(transport.primary.offset,0);assert.ok(transport.history.some(h=>h.kind==='wrap'));audio.stop();
 });
}
test('a logical silent layer is loaded at the current position before its scheduled entrance',async()=>{
 const {audio,transport,decoded,tick}=await fixture('b',{scene:'minimal'});transport.mixer.automatic=false;
 const initially=new Set(decoded);assert.equal(initially.size,3);
 transport.mixer.transition(new Map(banks.b.tracks.map((t,i)=>[t.id,MUSIC_POLICIES.b.levels.day[i]])),2);
 for(let now=2;now<20;now+=.1)await tick(now,'minimal');
 assert.ok(new Set(decoded).size>3);assert.ok(!decoded.includes('s0')&&!decoded.includes('s6'));audio.stop();
});
test('fractional offsets join adjacent windows on the same native sample without a gap',async()=>{
 const {audio,transport,sources,tick}=await fixture('a',{offset:29.91327});transport.mixer.automatic=false;
 for(let now=1;now<15;now+=.1)await tick(now);
 const windows=sources.filter(source=>source.musicWindowKey.startsWith('s2:')).sort((a,b)=>a.when-b.when);
 assert.ok(windows.length>=3);
 for(const source of windows)assert.ok(Math.abs(source.when*48000-Math.round(source.when*48000))<1e-8);
 for(let i=1;i<windows.length;i++)assert.equal(windows[i-1].musicWindowEnd,windows[i].when);
 audio.stop();
});
test('logical track gains have the original immediate level before future automation',async()=>{
 const {audio,transport}=await fixture('a');
 for(const voice of transport.primary.sources){
  const index=banks.a.tracks.findIndex(track=>track.id===voice.id);
  assert.equal(voice.volume.gain.value,MUSIC_POLICIES.a.levels.day[index]*banks.a.safetyGain*.45);
 }
 audio.stop();
});

test('delayed silent-layer entrances join the current clock without starting from zero',async()=>{
 let hold=false;const blocked=[];
 const {audio,transport,sources,decoded,tick}=await fixture('b',{scene:'minimal',beforeRead:()=>hold?new Promise(resolve=>blocked.push(resolve)):undefined});
 transport.mixer.automatic=false;hold=true;
 const initial=new Set(decoded);
 transport.mixer.transition(new Map(banks.b.tracks.map((t,i)=>[t.id,MUSIC_POLICIES.b.levels.day[i]])),2,false);
 for(let now=2;now<8;now+=.1)await tick(now,'minimal');
 assert.equal(blocked.length,2);assert.deepEqual(new Set(decoded),initial);
 hold=false;blocked.forEach(resolve=>resolve());
 for(let now=8;now<9;now+=.05)await tick(now,'minimal');
 const joined=sources.filter(source=>!initial.has(source.musicWindowKey.split(':')[0]));
 assert.ok(joined.length>0);
 for(const source of joined){
  assert.ok(source.when>=8);
  assert.ok(Math.abs(source.musicWindowFirstSample/48000+source.offset-(source.when-transport.primary.start))<1e-10);
 }
 assert.ok(!decoded.includes('s0')&&!decoded.includes('s6'));audio.stop();
});

test('a missed window deadline skips expired audio and recovers in phase with bounded PCM',async()=>{
 let hold=false;const blocked=[];
 const {audio,transport,pool,sources,tick}=await fixture('a',{beforeRead:()=>hold?new Promise(resolve=>blocked.push(resolve)):undefined});
 transport.mixer.automatic=false;hold=true;
 for(let now=1;now<15;now+=.1)await tick(now);
 assert.equal(blocked.length,2);
 hold=false;blocked.forEach(resolve=>resolve());
 for(let now=15;now<16;now+=.05)await tick(now);
 const recovered=sources.filter(source=>source.when>=15);
 assert.ok(recovered.length>=8);
 for(const source of recovered){
  assert.ok(source.musicWindowEnd>source.when);
  assert.ok(Math.abs(source.musicWindowFirstSample/48000+source.offset-(source.when-transport.primary.start))<1e-10);
 }
 assert.ok(pool.pcmBytes()<80*1024*1024);assert.equal(transport.windowError,undefined);audio.stop();
});

test('a wrap rounded a fraction below its start never passes a negative offset to native WebAudio',async()=>{
 const {audio,transport,sources}=await fixture('b');transport.mixer.automatic=false;
 const start=4.220000000000001;
 transport.createDeck(start,0,4);transport.pump(1.2);
 const wrap=sources.filter(source=>source.musicDeckStart===start);
 assert.ok(wrap.length>=8);assert.ok(wrap.every(source=>source.offset>=0));
 assert.ok(wrap.filter(source=>source.musicWindowFirstSample===0).every(source=>source.offset===0));
 audio.stop();
});

for(const pack of ['a','b'])test(pack+': stopping suspended music releases native buffer references before ended',async()=>{
 const {audio,pool}=await fixture(pack);
 const active=[...audio.active];assert.ok(active.length>0);
 assert.ok(active.every(source=>source.buffer));
 audio.context.state='suspended';audio.stopMusic();
 assert.equal(pool.pcmBytes(),0);assert.equal(audio.active.length,0);
 assert.ok(active.every(source=>source.buffer===null));
 for(const source of active)source.onended?.();
 assert.equal(audio.active.length,0);assert.equal(pool.pcmBytes(),0);
});

// Exercise runtime Opus window sizes and navigation without decoding audio in
// Node. Only the encoded-byte assembly is bypassed: codec correctness and native
// decoding have separate tests. The clock, mixer, pool and source lifecycle here
// are the production implementations, with deterministic native-ended callbacks.
for(const pack of ['a','b'])for(const branching of [false,true])test(`${pack}: long Opus ${branching?'branching':'wrapping'} playback releases expired windows`,async t=>{
 const runtime=JSON.parse(readFileSync(new URL(`../public/content/music-opus-windows-${pack}.json`,import.meta.url)));
 const windowIndex={...runtime,tracks:runtime.tracks.map(track=>({...track,windows:track.windows.map(({recipe,...window})=>window)}))};
 let seed=1729;const mixerRandom=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const {audio,transport,pool,sources,tick}=await fixture(pack,{windowIndex,offset:banks[pack].duration-10,random:()=>branching?0:1,mixerRandom});
 const scenes=['day','night','attack','minimal'],maximumWindowBytes=Math.max(...runtime.tracks.flatMap(track=>track.windows.map(window=>window.decodedSamples*8)));
 let peakBytes=0,peakSources=0,peakDecks=0,overlapBytes=0,returnedToSingle=false,finished=0,peak;
 for(let now=1;now<2*banks[pack].duration+40;now+=.1){
  await tick(now,scenes[Math.floor(now/37)%scenes.length]);
  const native=transport.decks.flatMap(deck=>deck.sources.flatMap(voice=>[...voice.native.values()]));
  assert.deepEqual(new Set(audio.active),new Set(native),'active sources must belong to a retained deck');
  assert.ok(transport.decks.length<=2,'only the outgoing and incoming deck may coexist');
  for(const key of pool.ready.keys())assert.ok(transport.wantedKeys.has(key),'expired PCM must not remain in the pool');
  const bytes=pool.pcmBytes();
  // Each deck needs current/next windows per stem; a pending destination can
  // require one extra window. This is a demand bound, independent of elapsed
  // track duration or number of loops, rather than an arbitrary RAM threshold.
  assert.ok(bytes<=5*runtime.tracks.length*maximumWindowBytes);
  if(bytes>peakBytes){peakBytes=bytes;peak={now,decks:transport.decks.length,nativeSources:native.length,readyWindows:pool.ready.size,plan:transport.plan?.kind??null};}
  peakSources=Math.max(peakSources,native.length);peakDecks=Math.max(peakDecks,transport.decks.length);
  if(transport.decks.length===2)overlapBytes=Math.max(overlapBytes,bytes);
  if(overlapBytes&&transport.decks.length===1&&bytes<overlapBytes)returnedToSingle=true;
  finished=0;
  for(const source of sources)if(source.stopAt<=now){assert.equal(source.buffer,null,'ended sources must release their PCM reference');finished++;}
 }
 if(branching)assert.ok(transport.lastEdge,'registered branch must be exercised');else assert.ok(transport.loops>=2,'multiple whole-bank wraps must be exercised');
 assert.equal(peakDecks,2);assert.ok(returnedToSingle,'PCM must fall again after the overlap');assert.ok(finished>20);
 for(const source of sources)assert.ok(Math.abs(source.musicWindowFirstSample/48000+source.offset-(source.musicDeckOffset+source.when-source.musicDeckStart))<1e-10);
 assert.equal(transport.windowError,undefined);
 t.diagnostic(JSON.stringify({pack,branching,seconds:2*banks[pack].duration+40,peakBytes,peakSources,peakDecks,peak,loops:transport.loops,jumps:transport.jumps,finishedSources:finished}));
 audio.stop();assert.equal(pool.pcmBytes(),0);assert.equal(pool.pending.size,0);assert.equal(audio.active.length,0);
 // Flush the stop callbacks as a running native context would do asynchronously.
 for(const source of sources)source.onended?.();assert.ok(sources.every(source=>source.buffer===null));
});

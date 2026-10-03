import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioSystem} from '../src/audio/audio.js';
const banks=Object.fromEntries(['a','b'].map(pack=>[pack,JSON.parse(readFileSync(new URL(`../public/content/music-${pack}.json`,import.meta.url),'utf8'))]));
async function fixture(pack,{offset=0,random=()=>1}={}){
 const sources=[],gains=[],audio=new AudioSystem({sfx:1,music:1},{json:async()=>banks[pack],bytes:async url=>({url}),musicTransport:{offset,random}});
 audio.context={state:'running',currentTime:1,async decodeAudioData(data){return data;},createGain(){const gain={value:0,calls:[],cancelScheduledValues(at){this.calls.push(['cancel',at]);},setValueAtTime(value,at){this.calls.push(['set',value,at]);},linearRampToValueAtTime(value,at){this.calls.push(['ramp',value,at]);}};const g={gain,connect(){},disconnect(){this.closed=true;}};gains.push(g);return g;},createBufferSource(){const source={playbackRate:{value:0},connect(){},disconnect(){this.closed=true;},start(when,offset){this.when=when;this.offset=offset;},stop(at){if(at===undefined)this.stopped=true;else this.stopAt=at;}};sources.push(source);return source;}};
 audio.sfx={items:[]};audio.sfxGain={};audio.musicGain={};await audio.gameplay(pack==='a'?1:2);
 const tick=now=>{audio.context.currentTime=now;audio.updateMusic({time:100,raid:null});};return {audio,sources,gains,tick};
}

for(const pack of ['a','b']){
 test(`${pack}: a partial splice failure releases both decks without throwing into simulation and can retry`,async()=>{
  const bank=banks[pack],{audio,sources,gains,tick}=await fixture(pack,{offset:bank.duration-8});
  const create=audio.context.createBufferSource;audio.context.createBufferSource=()=>{const source=create();if(sources.length===13)source.start=()=>{throw new Error('QA splice start failed');};return source;};
  const state={time:100,raid:null,ledger:{balance:800},rng:{state:76}},before=JSON.stringify(state);
  audio.context.currentTime=3.1;assert.doesNotThrow(()=>audio.updateMusic(state));assert.equal(JSON.stringify(state),before);
  assert.equal(audio.musicError.message,'QA splice start failed');assert.equal(audio.transport,null);assert.equal(audio.active.length,0);assert.equal(audio.voices.size,0);
  assert.ok(sources.every(s=>s.stopped&&s.closed));assert.ok(gains.every(g=>g.closed));
  audio.context.createBufferSource=create;await audio.gameplay(pack==='a'?1:2);assert.equal(audio.active.length,10);assert.equal(audio.musicError,null);audio.stop();
 });
 test(`${pack}: each of the three registered edges preserves exact destination and shared offsets`,async()=>{
  const bank=banks[pack];
  for(const edge of bank.navigation.edges){
   const from=bank.navigation.sections.find(s=>s.id===edge.source),to=bank.navigation.sections.find(s=>s.id===edge.target);
   const {audio,sources,tick}=await fixture(pack,{offset:from.end-6,random:()=>0});
   for(let now=1;now<7.3;now+=.025)tick(now);
   assert.equal(audio.transport.lastEdge,edge.id);assert.equal(audio.transport.section.id,to.id);assert.equal(sources.length,20);
   assert.ok(sources.slice(10).every(s=>Math.abs(s.offset-(to.start-.1))<1e-10&&Math.abs(s.when-7)<1e-9));
   audio.stop();assert.equal(audio.active.length,0);
  }
 });
 test(`${pack}: all natural sections reuse the original ten stems; global return crossfades together`,async()=>{
  const {audio,sources,gains,tick}=await fixture(pack),transport=audio.transport,bank=banks[pack];
  assert.equal(sources.length,10);assert.ok(sources.every(s=>!s.loop&&s.offset===0&&s.when===1.1));
  for(let now=1;now<bank.duration-6;now+=.05)tick(now);
  assert.equal(sources.length,10);assert.equal(transport.jumps,0);
  for(let now=bank.duration-6;now<bank.duration+2;now+=.05)tick(now);
  assert.equal(sources.length,20);assert.equal(transport.loops,1);assert.equal(transport.jumps,1);assert.equal(transport.decks.length,1);assert.equal(audio.active.length,10);
  const second=sources.slice(10),when=1.1+bank.duration-4;assert.ok(second.every(s=>Math.abs(s.when-when)<1e-10&&s.offset===0&&s.playbackRate.value===1));
  assert.ok(sources.slice(0,10).every(s=>s.stopped&&s.closed));assert.ok(transport.history.some(h=>h.kind==='wrap'));
  assert.equal(audio.mixer.start,when);assert.equal(audio.mixer.voices.get('s0').size,1);
  audio.stop();assert.equal(audio.transport,null);assert.ok(sources.every(s=>s.stopped&&s.closed));assert.ok(gains.every(g=>g.closed));
 });
 test(`${pack}: only its registered branches move together with native preroll and cooldown`,async()=>{
  const {audio,sources,tick}=await fixture(pack,{random:()=>0}),transport=audio.transport,bank=banks[pack],edge=bank.navigation.edges.find(e=>e.source==='A'),section=bank.navigation.sections.find(s=>s.id==='A'),target=bank.navigation.sections.find(s=>s.id===edge.target);
  for(let now=1;now<1.1+section.end+.1;now+=.025)tick(now);
  assert.equal(transport.lastEdge,edge.id);assert.equal(transport.section.id,target.id);assert.equal(transport.jumps,1);assert.equal(sources.length,20);
  const second=sources.slice(10),when=1.1+section.end-bank.navigation.spliceFade;
  assert.ok(second.every(s=>Math.abs(s.when-when)<1e-10&&Math.abs(s.offset-(target.start-.1))<1e-10&&s.playbackRate.value===1));
  for(let now=1.1+section.end+.1;now<1.1+section.end+bank.navigation.minSecondsBetweenJumps-.5;now+=.025)tick(now);
  assert.equal(transport.history.filter(h=>h.kind==='jump').length,1);assert.ok(transport.history.filter(h=>h.kind==='jump').every(h=>bank.navigation.edges.some(e=>e.target===h.section)));
  audio.stop();assert.equal(audio.active.length,0);
 });
 test(`${pack}: stop during prepared wrap releases both decks and all gain nodes`,async()=>{
  const bank=banks[pack],{audio,sources,gains,tick}=await fixture(pack,{offset:bank.duration-10});
  for(let now=1;now<5.1;now+=.05)tick(now);assert.equal(audio.transport.decks.length,2);assert.equal(audio.active.length,20);assert.equal(sources.length,20);
  audio.stop();assert.equal(audio.voices.size,0);assert.equal(audio.active.length,0);assert.ok(sources.every(s=>s.stopped&&s.closed));assert.ok(gains.every(g=>g.closed));
 });
 test(`${pack}: late callback preserves recording instead of a late branch; at end it restarts cleanly`,async()=>{
  const bank=banks[pack],edge=bank.navigation.edges.find(e=>e.source==='A'),from=bank.navigation.sections.find(s=>s.id===edge.source),{audio,sources,tick}=await fixture(pack,{offset:from.start+.5,random:()=>0});
  tick(1.2);assert.equal(audio.transport.plan.kind,'jump');tick(1.1+from.end-from.start-.5+.1);assert.equal(sources.length,10);assert.equal(audio.transport.jumps,0);assert.equal(audio.transport.section.id,bank.navigation.sections[bank.navigation.sections.indexOf(from)+1].id);
  for(let i=0;i<8;i++)tick(1.1+bank.duration-from.start-.5+2+i*.1);
  assert.equal(sources.length,20);assert.equal(audio.active.length,10);assert.ok(sources.slice(0,10).every(s=>s.stopped&&s.closed));assert.equal(audio.transport.history.at(-1).kind,'late-restart');audio.stop();
 });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareReplay,runReplay} from '../tools/replay_campaign.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {nextRandom} from '../src/simulation/rules.js';
import {MusicMixer} from '../src/audio/music-mixer.js';
import {createNativeVfx,createVfxAtlasRects} from '../src/rendering/vfx-native.js';
const read=async name=>JSON.parse(readFileSync(new URL(`../public/content/${name}.json`,import.meta.url)));
const bank=await read('music-a'),rects=createVfxAtlasRects(await read('vfx'),4096,2048);
for(const seed of [712,781])test(`seed ${seed}: native paid command replay survives two nights unchanged by VFX/music/global random draws`,async()=>{
 const original=Math.random;let base;
 try{Math.random=()=>{throw new Error('Domain consumed global presentation random');};base=await runReplay(await prepareReplay(read,{seed}));}finally{Math.random=original;}
 const gains=new Map(bank.tracks.map(t=>[t.id,{cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}}]));
 const mixer=new MusicMixer('a',bank,gains,0,'day',{automatic:true,random:()=>.99});let visualCalls=0,sprites=0;
 const decorated=await runReplay(await prepareReplay(read,{seed}),{visual:async({state},step)=>{
  for(let i=0;i<200;i++)Math.random();
  const fx=createNativeVfx('dig',rects,{density:step%2?.3:1,wind:step%2?1.7:.1});fx.advance(1.5);sprites+=fx.parts.length;visualCalls++;
  mixer.update(state.raid?'attack':state.time>=300?'night':'day',state.elapsed);
 }});
 assert.deepEqual(decorated.commands,base.commands);assert.deepEqual(decorated.events,base.events);assert.deepEqual(decorated.trace,base.trace);assert.equal(serialize(decorated.state),serialize(base.state));
 assert.equal(base.state.day,3);assert.equal(base.state.result,null);assert.ok(visualCalls>=25&&sprites>0);
 assert.equal(base.events.filter(e=>e.type==='Dawn').length,2);assert.ok(base.events.some(e=>e.type==='RaidSpawned'));assert.ok(base.events.some(e=>e.type==='RaidEnded'));
 assert.ok(!base.commands.some(c=>c.kind==='harvest'));assert.ok(base.events.some(e=>e.type==='HarvestRequested'&&e.automatic));assert.ok(base.events.some(e=>e.type==='CrateDelivered'));
 if(seed===781){assert.ok(base.events.some(e=>e.type==='HarvestRequested'&&e.automatic));assert.ok(base.state.crates.some(c=>c.delivered&&Number(c.value?.n)>0));}
 const clone=deserialize(serialize(base.state)),before=base.state.rng;
 assert.deepEqual(Array.from({length:128},()=>nextRandom(clone)),Array.from({length:128},()=>nextRandom(decorated.state)));
 assert.equal(base.state.rng,before);
});

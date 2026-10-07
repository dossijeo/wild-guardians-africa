import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
import {destructionSounds} from '../src/audio/destruction-audio.js';
import {createNativeDestructionEffects} from '../src/rendering/destruction-effects-native.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const kernel={hitSites:Array.from({length:8},()=>({p:[0,1,0],n:[0,1,0],birth:.5,maxRadius:0})),radiusAt:()=>1},building={seed:123};
test('native fragments count actual emissions and only first floor contacts without replay on restore',()=>{
 const fx=createNativeDestructionEffects(kernel,building);fx.initialize(.9);
 assert.equal(fx.stats.debrisEmitted,0);assert.equal(fx.stats.groundContacts,0);
 fx.emitDebris([0,1,0],[0,1,0]);assert.equal(fx.stats.debrisEmitted,1);
 fx.advance(2);assert.equal(fx.stats.groundContacts,1);
 fx.advance(.5);assert.equal(fx.stats.groundContacts,1);
 fx.restore(.9);fx.advance(.2);assert.equal(fx.stats.debrisEmitted,1);assert.equal(fx.stats.groundContacts,1);
 fx.emitDebris([0,1,0],[0,1,0]);fx.advance(0);assert.equal(fx.stats.groundContacts,1);
});
test('particle batches produce two distinct cues and empty frames stay silent',()=>{
 assert.deepEqual(destructionSounds({debrisEmitted:56,groundContacts:35}),['wall_debris_small','wall_debris_ground']);
 assert.deepEqual(destructionSounds({debrisEmitted:0,groundContacts:0}),[]);
});
function fixture(){
 const audio=new AudioSystem({sfx:1,music:0}),calls=[],state={pauses:[]};audio.context={state:'running',currentTime:0};
 audio.sound=async(id,options)=>{calls.push({id,options});};
 return{audio,calls,state,entity:{id:'center',x:0,z:0},listener:{x:48,z:0}};
}
test('batch cues are spatial, rate limited per center and expire on decode delay or pause',async()=>{
 const f=fixture(),counts={debrisEmitted:35,groundContacts:1};
 f.audio.destructionCue(counts,f.entity,f);f.audio.destructionCue(counts,f.entity,f);await flush();
 assert.equal(f.calls.length,2);assert.equal(f.calls[0].options.gain,.2);assert.equal(f.calls[0].options.emitter,'center');assert.equal(f.calls[0].options.family,'structure-debris');
 assert.equal(f.calls[0].options.isCurrent(),true);f.state.pauses.push('menu');assert.equal(f.calls[0].options.isCurrent(),false);
 f.audio.destructionCue(counts,f.entity,f);assert.equal(f.calls.length,2);f.state.pauses=[];
 f.audio.context.currentTime=.6;assert.equal(f.calls[0].options.isCurrent(),false);f.audio.destructionCue(counts,f.entity,f);assert.equal(f.calls.length,4);
 f.audio.generation++;assert.equal(f.calls[2].options.isCurrent(),false);
});
test('contact bookkeeping stays bounded for long campaigns and suspended contexts stay silent',()=>{
 const f=fixture();for(let i=0;i<300;i++)f.audio.destructionCue({groundContacts:1},{...f.entity,id:String(i)},f);
 assert.ok(f.audio.destructionTimes.size<=128);f.audio.context.state='suspended';const n=f.calls.length;f.audio.destructionCue({debrisEmitted:1},f.entity,f);assert.equal(f.calls.length,n);
});
test('the actual asynchronous audio route rejects delayed decode, pause and disposed scene',async()=>{
 for(const mode of ['live','delay','hidden','dispose']){
  const f=fixture(),started=[];delete f.audio.sound;
  f.audio.sfx={items:[{id:'wall_debris_small',loop:false,audio:{url:'/fragment.opus'}}]};
  let release;f.audio.buffer=()=>new Promise(done=>release=done);f.audio.startBuffer=(buffer,options)=>{started.push(options);return {};};
  f.audio.destructionCue({debrisEmitted:1},f.entity,f);await flush();assert.ok(release);
  if(mode==='delay')f.audio.context.currentTime=.6;if(mode==='hidden')f.state.pauses.push('hidden');if(mode==='dispose')f.audio.generation++;
  release({});await flush();assert.equal(started.length,mode==='live'?1:0,mode);
 }
});

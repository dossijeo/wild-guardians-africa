import test from 'node:test';
import assert from 'node:assert/strict';
import {GuardianAudio} from '../src/audio/guardian-audio.js';
import {GuardianLifecycle} from '../src/ui/guardian-lifecycle.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){let clock=0;const calls=[],stopped=[],audio=new GuardianAudio((id,options)=>{const source={};calls.push({id,options,source});return source;},source=>stopped.push(source),()=>clock);return {audio,calls,stopped,clock:dt=>clock+=dt};}

for(const reduced of [false,true])test('original '+(reduced?'reduced':'normal')+' lifecycle emits entry/exit once and keeps the approved full exit tail',async()=>{
  const f=fixture(),flow=new GuardianLifecycle(reduced),observe=()=>f.audio.observe(flow.phase);
  observe();flow.open();observe();observe();await flush();assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,'spirit_appear');
  flow.advance(flow.durations.enter,5);observe();flow.open();observe();flow.advance(flow.durations.change,5);observe();flow.advance(5,5);observe();assert.equal(f.calls.length,1);
  flow.finish();observe();flow.advance(flow.durations.farewell,5);observe();observe();await flush();
  assert.deepEqual(f.calls.map(c=>c.id),['spirit_appear','spirit_disappear']);assert.ok(f.stopped.includes(f.calls[0].source));
  flow.advance(flow.durations.exit,5);observe();for(let i=0;i<50;i++)observe();
  assert.equal(f.calls.length,2);assert.equal(f.audio.voice,f.calls[1].source);assert.ok(!f.stopped.includes(f.calls[1].source));
  f.calls[1].source.onended();assert.equal(f.audio.voice,null);
});

test('late portrait asset load still has one genuine entry when first rendered during reading',async()=>{
  const f=fixture();f.audio.observe('closed');f.audio.observe('reading');await flush();f.audio.observe('reading');f.audio.observe('rest');assert.equal(f.calls.length,1);
});

test('reopening during farewell or outro supersedes the old withdrawal',async()=>{
  for(const phase of ['farewell','outro']){
    const f=fixture();f.audio.observe('intro');await flush();f.audio.observe('farewell');if(phase==='outro'){f.audio.observe('outro');await flush();}
    const previous=f.audio.voice;f.audio.observe('intro');await flush();assert.ok(f.stopped.includes(previous));assert.equal(f.calls.at(-1).id,'spirit_appear');assert.equal(f.audio.phase,'intro');
  }
});

for(const phase of ['intro','reading','outro','closed'])test('immediate hiding from '+phase+' cancels every owned source and pending request',async()=>{
  const f=fixture();f.audio.observe('intro');await flush();if(phase!=='intro')f.audio.observe('reading');if(['outro','closed'].includes(phase)){f.audio.observe('outro');await flush();}if(phase==='closed')f.audio.observe('closed');
  const voice=f.audio.voice;f.audio.observe('hidden');assert.ok(f.stopped.includes(voice));assert.equal(f.audio.voice,null);assert.equal(f.audio.phase,'closed');
});

for(const reason of ['hidden','disposed','reentry','expiry','suspend'])test(reason+' invalidates a pending withdrawal decode',async()=>{
  const f=fixture();f.audio.observe('reading');await flush();let resolve,options;
  f.audio.play=(_id,o)=>{options=o;return new Promise(done=>resolve=done);};f.audio.observe('outro');
  if(['hidden','disposed'].includes(reason))f.audio.observe(reason);if(reason==='reentry'){f.audio.play=()=>null;f.audio.observe('intro');}
  if(reason==='expiry')f.clock(.6);if(reason==='suspend')f.audio.suspend();assert.equal(options.isCurrent(),false);
  const source={};resolve(source);await flush();assert.ok(f.stopped.includes(source));
});

test('a normal closed portrait still accepts its timely pending exit tail',async()=>{
  const f=fixture();let resolve,options;f.audio.observe('reading');await flush();f.audio.play=(_id,o)=>{options=o;return new Promise(done=>resolve=done);};
  f.audio.observe('outro');f.audio.observe('closed');assert.equal(options.isCurrent(),true);const source={};resolve(source);await flush();assert.equal(f.audio.voice,source);
});

test('suspension cancels voices and silently seeds the unchanged portrait on resume',async()=>{
  const f=fixture();f.audio.observe('intro');await flush();f.audio.suspend();f.audio.observe('intro');f.audio.observe('reading');assert.equal(f.calls.length,1);
  f.audio.observe('outro');await flush();assert.equal(f.calls.length,2);f.audio.dispose();f.audio.observe('intro');await flush();assert.equal(f.calls.length,3);
});

test('presentation callback failures do not form a per-frame retry loop',()=>{
  const f=fixture();f.audio.play=()=>{throw Error('audio unavailable');};assert.doesNotThrow(()=>f.audio.observe('intro'));
  const ticket=f.audio.ticket;for(let i=0;i<1000;i++)f.audio.observe('intro');assert.equal(f.audio.ticket,ticket);
});

test('portrait cues use the UI bus and avatar emitter without a fictitious world position',async()=>{
  const f=fixture();f.audio.observe('intro');await flush();const {options}=f.calls[0];assert.equal(options.bus,'ui');assert.equal(options.emitter,'guardian-avatar');assert.equal(options.family,'spirit-presence');assert.equal(options.gain,1);
});

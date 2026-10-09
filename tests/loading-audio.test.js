import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingAudio} from '../src/audio/loading-audio.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(state={day:1,time:0}){const calls=[],stops=[],requests=[];const audio={context:{state:'running'},ambientSound(id,options){const pending=deferred();calls.push({id,options});requests.push(pending);return pending.promise;},sound(id,options){const pending=deferred();calls.push({id,options});requests.push(pending);return pending.promise;},stopVoice:source=>stops.push(source)};return {audio,calls,stops,requests,owner:new LoadingAudio(audio,state)};}

test('one day/night loop uses real saved time and retries after autoplay unlock without duplication',async()=>{
 for(const [state,id] of [[{day:1,time:0},'amb_birds'],[{day:8,time:310},'amb_night']]){
  const f=fixture(state);f.audio.context.state='suspended';assert.equal(await f.owner.start(),null);assert.equal(f.calls.length,0);f.audio.context.state='running';const first=f.owner.start(),second=f.owner.start();assert.equal(first,second);assert.equal(f.calls[0].id,id);assert.equal(f.calls.length,1);const voice={};f.requests[0].resolve(voice);assert.equal(await first,voice);assert.equal(await f.owner.start(),voice);assert.equal(f.calls.length,1);f.owner.dispose();assert.deepEqual(f.stops,[voice]);
 }
});
test('additional planting emits one catalog cue per accepted trigger and ends with presentation ownership',async()=>{
 const f=fixture();assert.equal(f.calls.length,0);const cue=f.owner.plant();assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,'farm_crop_interact');const voice={};f.requests[0].resolve(voice);await cue;voice.onended();assert.equal(f.owner.voices.size,0);f.owner.dispose();assert.equal(await f.owner.plant(),null);assert.equal(f.calls.length,1);
});
test('cancel/error/handoff invalidates pending sounds and stops late returned sources',async()=>{
 const f=fixture(),loop=f.owner.start(),plant=f.owner.plant();const loopOptions=f.calls[0].options,plantOptions=f.calls[1].options;assert.ok(loopOptions.isCurrent()&&plantOptions.isCurrent());f.owner.dispose();assert.equal(loopOptions.isCurrent(),false);assert.equal(plantOptions.isCurrent(),false);const a={},b={};f.requests[0].resolve(a);f.requests[1].resolve(b);await Promise.all([loop,plant]);assert.deepEqual(f.stops,[a,b]);assert.equal(f.owner.pending.size,0);assert.equal(f.owner.voices.size,0);f.owner.dispose();assert.equal(f.stops.length,2);
});
test('a phase change stops the old ambience and rejects its late completion',async()=>{
 const f=fixture(),day=f.owner.start();f.owner.setState({day:3,time:310});const night=f.owner.start();assert.deepEqual(f.calls.map(c=>c.id),['amb_birds','amb_night']);const a={},b={};f.requests[0].resolve(a);f.requests[1].resolve(b);assert.equal(await day,null);assert.equal(await night,b);assert.deepEqual(f.stops,[a]);f.owner.dispose();assert.deepEqual(f.stops,[a,b]);
});

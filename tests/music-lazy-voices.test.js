import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicMixer} from '../src/audio/music-mixer.js';
const bank={safetyGain:1,tracks:Array.from({length:10},(_,i)=>({id:'s'+i}))};
function gain(){return {calls:[],setValueAtTime(value,time){this.calls.push(['set',value,time]);},cancelScheduledValues(time){this.calls.push(['cancel',time]);},linearRampToValueAtTime(value,time){this.calls.push(['ramp',value,time]);}};}
test('a silent stem keeps a logical clock without a decoded voice and is not considered audible',()=>{
  const mixer=new MusicMixer('a',bank,new Map(),0,'day');
  assert.equal(mixer.voices.get('s7').size,0);assert.equal(mixer.audibleDuring('s7',0,6),false);
  assert.equal(mixer.audibleDuring('s2',0,6),true);
});
test('a future entrance is visible for prefetch before it is audible',()=>{
  const mixer=new MusicMixer('a',bank,new Map(),0,'day');mixer.pending=[{id:'s7',to:.5,when:8}];
  assert.equal(mixer.audibleDuring('s7',0,7),false);assert.equal(mixer.audibleDuring('s7',0,9),true);
  assert.equal(mixer.value('s7',7),0);
});
test('a stem with no source still advances its fade and a later voice joins at the correct level',()=>{
  const mixer=new MusicMixer('a',bank,new Map(),0,'day');mixer.setCurve('s7',.8,10,2);
  assert.equal(mixer.value('s7',11),.4);assert.equal(mixer.voices.get('s7').size,0);
  const voice=gain();mixer.addVoices(new Map([['s7',voice]]),11);
  assert.deepEqual(voice.calls,[['set',.4*.45,11],['ramp',.8*.45,12]]);
  mixer.removeVoices(new Map([['s7',voice]]));assert.equal(mixer.voices.get('s7').size,0);assert.equal(mixer.value('s7',13),.8);
});
test('a completed fade to zero can release PCM, but a fade still audible within the window cannot',()=>{
  const mixer=new MusicMixer('a',bank,new Map(),0,'day');mixer.setCurve('s2',0,10,2);
  assert.equal(mixer.audibleDuring('s2',11,13),true);assert.equal(mixer.audibleDuring('s2',12,14),false);
});
test('success and failure envelopes affect logical tracks even when no media is allocated',()=>{
  for(const event of ['success','failure']){
    const mixer=new MusicMixer('a',bank,new Map(),0,'day');assert.equal(mixer.triggerEvent(event,10),true);
    for(const [id,to] of mixer.levels)assert.equal(mixer.value(id,13),to);
    assert.ok([...mixer.voices.values()].every(voices=>voices.size===0));
  }
});

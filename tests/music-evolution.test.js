import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MusicMixer} from '../src/audio/music-mixer.js';
import {MUSIC_POLICIES,musicEventLevels} from '../src/audio/music-policy.js';
import {AudioSystem} from '../src/audio/audio.js';
const banks=Object.fromEntries(['a','b'].map(p=>[p,JSON.parse(readFileSync(new URL(`../public/content/music-${p}.json`,import.meta.url)))]));
function fixture(pack,scene='day',random=()=>0){
 const gains=new Map(banks[pack].tracks.map(t=>[t.id,{calls:[],cancelScheduledValues(at){this.calls.push(['cancel',at]);},setValueAtTime(v,at){this.calls.push(['set',v,at]);},linearRampToValueAtTime(v,at){this.calls.push(['ramp',v,at]);}}]));
 return {gains,mixer:new MusicMixer(pack,banks[pack],gains,1,scene,{automatic:true,random})};
}
function tick(mixer,from,to,scene=mixer.scene){for(let t=from;t<=to;t+=.04)mixer.update(scene,t);}
for(const pack of ['a','b']){
 test(`${pack}: native evolution changes one eligible layer on its grid and keeps anchors and quiet stems`,()=>{
  const {mixer,gains}=fixture(pack),base=MUSIC_POLICIES[pack].levels.day;
  mixer.update('day',mixer.nextAuto-.001);assert.equal(mixer.lastAutoId,null);
  const now=mixer.nextAuto;mixer.update('day',now);assert.equal(mixer.pending.length,1);
  const action={...mixer.pending[0]},bar=240/mixer.policy.bpm;
  assert.ok(Math.abs((action.when-1-mixer.policy.gridOffset)/bar-Math.round((action.when-1-mixer.policy.gridOffset)/bar))<1e-10);
  assert.equal(mixer.nextAuto,now+bar*16);tick(mixer,now,action.when+2.2);
  assert.equal([...gains].filter(([,g])=>g.calls.length).length,1);
  assert.equal(mixer.value(action.id,action.when+2.2),action.to);
  for(const t of mixer.bank.tracks)if(t.id!==action.id)assert.equal(mixer.value(t.id,action.when+2.2),base[Number(t.id.slice(1))]);
  for(let i=0;i<50;i++){const previous=mixer.lastAutoId,t=mixer.nextAuto;mixer.update('day',t);if(mixer.pending.length){assert.notEqual(mixer.lastAutoId,previous);assert.ok(!mixer.bank.tracks.find(x=>x.id===mixer.lastAutoId).nearSilent);tick(mixer,t,mixer.pending[0].when+2.3);}}
  for(const id of mixer.policy.anchors)assert.ok(mixer.levels.get(id)>0);
 });
 test(`${pack}: evolution waits for transitions, temporary arrangements and protected section cuts`,()=>{
  const {mixer}=fixture(pack);const now=mixer.nextAuto;
  mixer.update('day',now,{nearSplice:true});assert.equal(mixer.lastAutoId,null);
  mixer.update('day',now+1,{protectedUntil:now+2});assert.equal(mixer.lastAutoId,null);
  mixer.triggerEvent('success',now+2);mixer.update('day',now+3);assert.equal(mixer.lastAutoId,null);
  const sceneChange=now+4;mixer.update('night',sceneChange);assert.equal(mixer.event,null);assert.ok(mixer.pending.length);
  mixer.update('night',sceneChange+.1);assert.equal(mixer.lastAutoId,null);
 });
 test(`${pack}: repeated result arrangements preserve the evolved snapshot and return progressively`,()=>{
  const {mixer}=fixture(pack);const first=mixer.nextAuto;mixer.update('day',first);tick(mixer,first,first+5);
  const saved=new Map(mixer.levels),now=first+6;
  mixer.triggerEvent('success',now);tick(mixer,now,now+3);
  assert.deepEqual(mixer.bank.tracks.map(t=>mixer.value(t.id,now+3)),musicEventLevels(pack,'success'));
  mixer.triggerEvent('failure',now+4);assert.deepEqual(mixer.event.snapshot,saved);
  tick(mixer,now+4,now+7);assert.deepEqual(mixer.bank.tracks.map(t=>mixer.value(t.id,now+7)),musicEventLevels(pack,'failure'));
  const end=now+4+240/mixer.policy.bpm*8;assert.equal(mixer.event.at,end);
  tick(mixer,now+7,end+26);assert.equal(mixer.event,null);assert.deepEqual(mixer.levels,saved);
  for(const [id,value] of saved)assert.equal(mixer.value(id,end+26),value);
 });
 test(`${pack}: overlapping decks receive the same result curves and later voices inherit their remaining ramp`,()=>{
  const {mixer,gains}=fixture(pack),copy=new Map([...gains].map(([id])=>[id,{calls:[],cancelScheduledValues(at){this.calls.push(['cancel',at]);},setValueAtTime(v,at){this.calls.push(['set',v,at]);},linearRampToValueAtTime(v,at){this.calls.push(['ramp',v,at]);}}]));
  mixer.addVoices(copy,2);for(const gain of copy.values())gain.calls=[];
  mixer.triggerEvent('success',3);for(const [id,gain] of gains)assert.deepEqual(copy.get(id).calls,gain.calls);
  mixer.removeVoices(copy);assert.ok([...mixer.voices.values()].every(v=>v.size===1));
  for(const gain of copy.values())gain.calls=[];
  mixer.addVoices(copy,4);
  for(const [id,gain] of copy){assert.ok(Math.abs(gain.calls[0][1]-mixer.value(id,4)*mixer.scale)<1e-12);assert.deepEqual(gain.calls.at(-1),['ramp',musicEventLevels(pack,'success')[Number(id.slice(1))]*mixer.scale,5.4399999999999995]);}
 });
}
test('result integration deduplicates events, survives suspension and applies after the new scene without mutating state',()=>{
 const {mixer}=fixture('a'),audio=new AudioSystem({sfx:0,music:0});audio.mixer=mixer;audio.sound=async()=>{};
 audio.context={state:'suspended',currentTime:40};const state={time:350,raid:null,result:'gameover',rng:{state:17},pauses:['result']},before=JSON.stringify(state);
 const old={id:'old',type:'CampaignWon'},fresh={id:'new',type:'GameOver'};audio.remember([old]);audio.process([old,fresh]);audio.updateMusic(state);assert.equal(mixer.event,null);
 audio.context.state='running';audio.updateMusic(state);assert.equal(mixer.scene,'night');assert.equal(mixer.event.kind,'failure');const at=mixer.event.at;
 audio.context.currentTime=41;audio.process([old,fresh]);audio.updateMusic(state);assert.equal(mixer.event.at,at);assert.equal(JSON.stringify(state),before);
 audio.stop();assert.equal(audio.musicEvent,null);assert.equal(audio.mixer,null);
});

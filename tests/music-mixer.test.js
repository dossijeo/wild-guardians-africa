import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioSystem} from '../src/audio/audio.js';
import {MUSIC_POLICIES,gameplayMusicScene} from '../src/audio/music-policy.js';

const banks=Object.fromEntries(['a','b'].map(pack=>[pack,JSON.parse(readFileSync(new URL(`../public/content/music-${pack}.json`,import.meta.url),'utf8'))]));
function fixture(){
 const sources=[],gains=[];
 const audio=new AudioSystem({sfx:1,music:1},{json:async url=>banks[url.includes('music-a')?'a':'b'],bytes:async url=>({url})});
 audio.context={state:'running',currentTime:1,async decodeAudioData(data){return data;},createGain(){const gain={value:0,calls:[],cancelScheduledValues(at){this.calls.push(['cancel',at]);},setValueAtTime(value,at){this.calls.push(['set',value,at]);},linearRampToValueAtTime(value,at){this.calls.push(['ramp',value,at]);}};const node={gain,connect(){},disconnect(){this.closed=true;}};gains.push(node);return node;},createBufferSource(){const source={playbackRate:{value:0},connect(){},disconnect(){this.closed=true;},start(when){this.when=when;},stop(at){if(at===undefined)this.stopped=true;else this.stopAt=at;}};sources.push(source);return source;}};
 audio.sfx={items:[]};audio.sfxGain={};audio.musicGain={};return {audio,sources,gains};
}

test('native A/B use independent audited grids and presets in the original ten-track order',()=>{
 assert.equal(MUSIC_POLICIES.a.bpm,110);assert.equal(MUSIC_POLICIES.b.bpm,108);
 assert.equal(MUSIC_POLICIES.a.gridOffset,1.437);assert.equal(MUSIC_POLICIES.b.gridOffset,1.211);
 assert.deepEqual(MUSIC_POLICIES.a.levels.night,[.06,.24,.52,.22,.27,0,.12,0,.08,.78]);
 assert.deepEqual(MUSIC_POLICIES.b.levels.night,[0,.06,.27,.6,.48,.12,0,.6,.12,.82]);
 for(const pack of ['a','b']){
  const policy=MUSIC_POLICIES[pack],bank=banks[pack];assert.equal(bank.bpm,policy.bpm);assert.ok(Math.abs(bank.navigation.downbeatOffset-policy.gridOffset)<.001);
  assert.deepEqual(bank.tracks.map(t=>t.id),Array.from({length:10},(_,i)=>'s'+i));
  for(const levels of Object.values(policy.levels)){assert.equal(levels.length,10);assert.ok(levels.every(v=>v>=0&&v<=1));}
  assert.equal(policy.fade,2);assert.equal(policy.quantize,1);
 }
});

for(const pack of ['a','b'])test(`${pack}: scene changes preserve stems, quantize on its grid and reach the native target`,async()=>{
 const {audio,sources,gains}=fixture(),day=pack==='a'?1:2;await audio.gameplay(day);const policy=MUSIC_POLICIES[pack],scale=banks[pack].safetyGain*.45;
 assert.equal(sources.length,10);assert.ok(sources.every(s=>s.when===1.1&&s.playbackRate.value===1));
 for(let i=0;i<10;i++)assert.ok(Math.abs(audio.voices.get(sources[i]).volume.gain.value-policy.levels.day[i]*scale)<1e-12);
 audio.updateMusic({time:350,raid:null});const planned=audio.mixer.pending.map(p=>({...p}));assert.ok(planned.length>0);
 const first=planned[0].when,origin=1.1+policy.gridOffset,bar=240/policy.bpm;
 assert.ok(Math.abs((first-origin)/bar-Math.round((first-origin)/bar))<1e-10);
 for(let now=1;now<35;now+=.05){audio.context.currentTime=now;audio.updateMusic({time:350,raid:null});}
 assert.equal(audio.mixer.pending.length,0);assert.equal(sources.length,10);assert.ok(sources.every(s=>!s.stopped));
 for(let i=0;i<10;i++)assert.ok(Math.abs(audio.mixer.value('s'+i,35)-policy.levels.night[i])<1e-12);
 assert.ok(gains.some(g=>g.gain.calls.some(c=>c[0]==='ramp')));
 audio.updateMusic({time:350,raid:{animals:[{}]}});assert.equal(audio.mixer.scene,'attack');
 audio.context.currentTime=35.2;audio.updateMusic({time:100,raid:null});assert.equal(audio.mixer.scene,'day');
 assert.ok(audio.mixer.pending.every(p=>p.to===policy.levels.day[Number(p.id.slice(1))]));
 const calls=gains.reduce((n,g)=>n+g.gain.calls.length,0);audio.context.state='suspended';audio.updateMusic({time:350,raid:{}});
 assert.equal(gains.reduce((n,g)=>n+g.gain.calls.length,0),calls);assert.equal(sources.length,10);
 audio.stop();assert.equal(audio.mixer,null);assert.ok(sources.every(s=>s.stopped&&s.closed));assert.ok(gains.every(g=>g.closed));
});

test('alternating packs cleans all old stems; scene mixing reads but never mutates game state',async()=>{
 const {audio,sources}=fixture(),state={time:400,raid:{animals:[{id:'a'}]},ledger:{balance:800},rng:{state:72},speed:5};const before=JSON.stringify(state);
 assert.equal(gameplayMusicScene(state),'attack');audio.updateMusic(state);await audio.gameplay(1);assert.equal(audio.mixer.scene,'attack');
 await audio.gameplay(2);assert.equal(sources.length,20);assert.ok(sources.slice(0,10).every(s=>s.stopped&&s.closed));assert.equal(audio.active.length,10);
 audio.updateMusic(state);assert.equal(JSON.stringify(state),before);assert.ok(sources.every(s=>s.playbackRate.value===1));
});


import * as Game from '../src/simulation/game.js';
import {rational} from '../src/simulation/money.js';
import {serialize} from '../src/persistence/snapshots.js';
test('paid native dawn automatically selects the next original ten-stem pack without touching domain or SFX',async()=>{
 const state=Game.newGame({seed:712,slotId:'music-dawn'});Game.resume(state,'intro');state.ledger.balance=rational(10000);state.day=101;state.completedNights=100;state.postgame=true;state.initialPreparation=false;state.tutorial.step='done';
 const nav={placement:()=>({valid:true,suppress:[]}),setState(){},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};Game.placeStructure(state,'center',{x:4,z:0},nav);Game.plant(state,'seed','mijo',10,4,nav);Game.pause(state,'hiring');Game.hire(state,'hire',{olderFemale:1});
 const {audio,sources}=fixture();const world=audio.startBuffer({}, {family:'watering',bus:'world'});let before=serialize(state);audio.updateMusic(state);await new Promise(done=>setImmediate(done));assert.equal(serialize(state),before);assert.equal(audio.pack,'a');assert.equal(audio.transport.primary.sources.length,10);const previous=audio.transport.primary.sources.slice();
 Game.tick(state,600,nav);assert.equal(state.day,102);assert.ok(state.events.some(e=>e.type==='Dawn'));assert.ok(state.pauses.includes('hiring'));before=serialize(state);audio.updateMusic(state);await new Promise(done=>setImmediate(done));assert.equal(serialize(state),before);assert.equal(audio.pack,'b');assert.equal(audio.transport.primary.sources.length,10);assert.ok(previous.every(s=>s.stopped&&s.closed));assert.equal(world.stopped,undefined);assert.equal(audio.active.length,11);
 assert.ok(audio.transport.primary.sources.every(s=>s.playbackRate.value===1));assert.equal(new Set(audio.transport.primary.sources.map(s=>s.when)).size,1);assert.ok(banks.a.tracks.filter(t=>!t.silent).every(t=>!audio.buffers.has(t.data.url)));assert.ok(banks.b.tracks.filter(t=>!t.silent).every(t=>audio.buffers.has(t.data.url)));audio.stop();assert.ok(sources.every(s=>s.stopped));
});

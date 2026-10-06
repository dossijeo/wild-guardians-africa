import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {AudioSystem} from '../src/audio/audio.js';
import {wallBuildSound} from '../src/audio/structure-audio.js';
import {clearNavigation} from './clear-navigation.js';
import {serialize} from '../src/persistence/snapshots.js';
import {rational,transact,numberOf} from '../src/simulation/money.js';
const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url))),flush=()=>new Promise(resolve=>setImmediate(resolve));
const expected={zarzas:'build_place',empalizada:'build_wood',piedra:'build_stone',adobe:'build_adobe',reforzado:'build_adobe'};
const points=[[10,0],[16,0]];
function world(){const s=Game.newGame({seed:712}),nav=clearNavigation();Game.resume(s,'intro');s.tutorial.step='done';Game.placeStructure(s,'center',{x:4,z:0},nav);return{s,nav};}
function fixture(){const audio=new AudioSystem({sfx:1,music:0}),sources=[];audio.context={state:'running',currentTime:0,createBufferSource(){const source={playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){}};sources.push(source);return source;},createGain(){return{gain:{value:0},connect(){},disconnect(){}};}};audio.sfxGain={};audio.musicGain={};audio.sfx=bank;audio.buffer=async url=>({url});return{audio,sources};}
for(const [material,id] of Object.entries(expected))test(`paid ${material} stroke selects one contextual placement plus completion, never one per module`,async()=>{
 const {s,nav}=world(),{audio,sources}=fixture(),money=numberOf(s.ledger.balance);audio.remember(s.events);const before=s.events.length;
 assert.ok(Game.buildWallChain(s,'paid-stroke',material,points,nav));const events=s.events.slice(before),event=events.find(e=>e.type==='WallChainBuilt');assert.ok(event.count>1);assert.equal(money-numberOf(s.ledger.balance),s.structures.filter(e=>e.kind==='wall').reduce((sum,e)=>sum+e.cost,0));
 const snapshot=serialize(s);audio.process(events,{state:s,listener:{x:event.presentation.x+48,z:event.presentation.z}});audio.process(events,{state:s});await flush();
 assert.deepEqual(sources.map(source=>bank.items.find(i=>i.audio.url===source.buffer.url)?.id),[id,'build_complete']);
 assert.ok([...audio.voices.values()].every(voice=>voice.bus==='world'&&voice.emitter===event.targetId&&voice.volume.gain.value===.2));assert.equal(serialize(s),snapshot);
 assert.equal(Game.buildWallChain(s,'paid-stroke',material,points,nav),false);audio.process(s.events,{state:s});await flush();assert.equal(sources.length,2);
 const loaded=fixture();loaded.audio.remember(s.events);loaded.audio.process(s.events,{state:s});await flush();assert.equal(loaded.sources.length,0);audio.stop();loaded.audio.stop();
});
test('preview, a completely forbidden stroke and insufficient funds emit no construction sound',async()=>{
 for(const mode of ['preview','blocked','funds']){
  const {s,nav}=world(),{audio,sources}=fixture();audio.remember(s.events);const before=s.events.length;
  if(mode==='preview')Game.previewWallChain(s,'empalizada',points,nav);
  else if(mode==='blocked'){nav.wallPlacement=()=>({valid:false,suppress:[]});assert.equal(Game.buildWallChain(s,'blocked','empalizada',points,nav),false);}
  else{transact(s.ledger,'qa-empty-wallet',rational(-numberOf(s.ledger.balance)));assert.throws(()=>Game.buildWallChain(s,'funds','empalizada',points,nav));}
  assert.equal(s.events.length,before);audio.process(s.events,{state:s});await flush();assert.equal(sources.length,0);audio.stop();
 }
});
test('only confirmed positive-count material strokes choose a variant; centers and legacy events retain generic routing',()=>{
 for(const event of [{type:'PlacementCommitted',material:'piedra',count:3},{type:'WallChainBuilt',material:'piedra',count:0},{type:'WallChainBuilt',material:'unknown',count:3},{type:'WallChainBuilt',material:'piedra'}])assert.equal(wallBuildSound(event),null);
});
test('late decode, hidden/menu pauses and scene disposal reject both stale wall placement and completion',async()=>{
 for(const mode of ['late','hidden','menu','stop']){
  const {s,nav}=world(),{audio,sources}=fixture();audio.remember(s.events);Game.buildWallChain(s,'paid-stroke','empalizada',points,nav);const pending=[];audio.buffer=url=>new Promise(resolve=>pending.push(()=>resolve({url})));
  audio.process(s.events,{state:s});await flush();assert.equal(pending.length,2);if(mode==='late')audio.context.currentTime=.6;else if(mode==='stop')audio.stop();else s.pauses.push(mode);
  for(const finish of pending)finish();await flush();assert.equal(sources.length,0,mode);audio.stop();
 }
});

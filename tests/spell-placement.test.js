import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as Game from '../src/simulation/game.js';
import {castPickedSpell,pickedSpellCommand,dispatchPickedSpell} from '../src/app/spell-placement.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const nav={placement:()=>({valid:true}),setState(){},path:(_a,b)=>[{x:b.x,z:b.z}]};
function ready(){
  const s=Game.newGame({seed:712,slotId:'picked-spell'});Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:12,z:8},nav);Game.plant(s,'seed','mijo',17,8,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  s.day=5;s.initialPreparation=false;return s;
}
for(const kind of ['shield','growth','multiply'])test(`${kind}: tapping elevated crop covers it instead of terrain behind it`,()=>{
  const s=ready(),p=s.plants[0];
  const origin=new THREE.Vector3(p.x+5,6,p.z+10),top=new THREE.Vector3(p.x,3,p.z);
  const ray=new THREE.Ray(origin,top.clone().sub(origin).normalize());
  const ground=ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
  assert.ok(Math.hypot(ground.x-p.x,ground.z-p.z)>Game.spellRadius(kind));
  castPickedSpell(s,'tap',kind,{entityId:p.id,point:{x:ground.x,z:ground.z}},nav);
  assert.equal(s.spells.length,1);assert.equal(Game.spellAt(s,kind,p),s.spells[0]);
  assert.deepEqual([s.spells[0].x,s.spells[0].z],[p.x,p.z]);
  assert.equal(s.events.filter(e=>e.type==='SpellActivated').length,1);
  assert.equal(s.events.find(e=>e.type==='SpellActivated').commandId,'tap');
  assert.equal(s.cooldowns[kind],kind==='shield'?90:0);if(kind==='multiply')assert.equal(p.multiplyHarvest,true);
  const saved=serialize(s);assert.equal(castPickedSpell(s,'tap',kind,{entityId:p.id,point:null},nav),false);assert.equal(serialize(s),saved);
});
test('agricultural powers require a live plant hit, while Shield keeps free placement',()=>{
 for(const kind of ['growth','multiply']){
  const s=ready();for(const hit of [{entityId:null,point:{x:17,z:8}},{entityId:s.structures[0].id,point:{x:17,z:8}}]){
   const before=serialize(s);assert.equal(castPickedSpell(s,'empty',kind,hit,nav),false);assert.equal(serialize(s),before);
  }
  s.plants[0].alive=false;assert.equal(castPickedSpell(s,'dead',kind,{entityId:s.plants[0].id,point:{x:40,z:50}},nav),false);
 }
 const s=ready();castPickedSpell(s,'shield','shield',{entityId:null,point:{x:40,z:50}},nav);
 assert.deepEqual([s.spells[0].x,s.spells[0].z],[40,50]);
});
for(const kind of ['shield','growth','multiply'])test(`${kind}: transferable command preserves picked target and spell outcome`,()=>{
 const local=ready(),remote=deserialize(serialize(local)),p=local.plants[0],pick={entityId:p.id,point:{x:90,z:90},hitPoint:new THREE.Vector3(p.x,3,p.z),origin:()=>new THREE.Vector3(p.x+5,6,p.z+10)};
 const command=pickedSpellCommand(remote,'transfer',kind,pick);assert.doesNotThrow(()=>structuredClone(command));assert.equal(typeof command.selection.origin,'object');assert.deepEqual(command.selection.origin,{x:p.x+5,y:6,z:p.z+10});
 assert.equal(castPickedSpell(local,'transfer',kind,pick,nav),true);assert.equal(Game.cast(remote,command.id,kind,command.x,command.z,nav,command.selection),true);assert.equal(serialize(remote),serialize(local));
});
test('transferable command retains missing-target behavior and tolerates failed visual placement',()=>{
 const s=ready();assert.equal(pickedSpellCommand(s,'none','growth',{entityId:null,point:{x:1,z:2}}),null);assert.throws(()=>pickedSpellCommand(s,'none','attack',{entityId:'missing'}),/bestia/);
 const command=pickedSpellCommand(s,'shield','shield',{point:{x:40,z:50},origin:()=>{throw Error('visual failure');}});assert.equal(command.selection.origin,null);
});
test('picked spell dispatch waits for the Worker and reports its rejection',async()=>{
 const state=ready(),plant=state.plants[0],sent=[];let resolve;const runtime={submit(command){sent.push(command);return new Promise(r=>{resolve=r;});}},pick={entityId:plant.id,origin:()=>({x:1,y:2,z:3})};
 const pending=dispatchPickedSpell(state,'worker-spell','growth',pick,nav,runtime);assert.equal(sent.length,1);assert.equal(sent[0].kind,'castAgricultural');resolve({value:false,rejection:'No disponible'});await assert.rejects(pending,/No disponible/);
 assert.equal(dispatchPickedSpell(state,'empty','growth',{entityId:null},nav,runtime),false);assert.equal(sent.length,1);
});

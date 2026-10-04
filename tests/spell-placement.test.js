import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as Game from '../src/simulation/game.js';
import {castPickedSpell} from '../src/app/spell-placement.js';
import {serialize} from '../src/persistence/snapshots.js';

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
  assert.ok(s.cooldowns[kind]>0);if(kind==='multiply')assert.equal(p.multiplyHarvest,true);
  const saved=serialize(s);assert.equal(castPickedSpell(s,'tap',kind,{entityId:p.id,point:null},nav),false);assert.equal(serialize(s),saved);
});
test('free terrain remains the chosen point even over a structure; missing terrain can fall back to the structure',()=>{
  for(const point of [{x:40,z:50},null]){
    const s=ready(),center=s.structures[0];castPickedSpell(s,'tap','growth',{entityId:center.id,point},nav);
    assert.deepEqual([s.spells[0].x,s.spells[0].z],point?[40,50]:[center.x,center.z]);
  }
});
test('dead crops do not capture placement, empty sky does nothing, and invalid spells keep their rejection',()=>{
  const s=ready(),p=s.plants[0];p.alive=false;p.harvestRequested=false;
  const before=serialize(s);assert.equal(castPickedSpell(s,'sky','growth',{entityId:null,point:null},nav),false);assert.equal(serialize(s),before);
  castPickedSpell(s,'ground','growth',{entityId:p.id,point:{x:40,z:50}},nav);
  assert.deepEqual([s.spells[0].x,s.spells[0].z],[40,50]);
  const active=serialize(s);assert.throws(()=>castPickedSpell(s,'cooldown','growth',{entityId:p.id,point:{x:60,z:50}},nav),/recargando/);assert.equal(serialize(s),active);
});

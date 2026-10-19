import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {waterPlant} from '../src/simulation/crops.js';
import {agricultureVfxPlans} from '../src/rendering/agriculture-vfx.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function farm(){
  const s=Game.newGame({slotId:'single-plant-magic',seed:712});Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:0,z:0},nav);
  Game.plant(s,'seed-a','mijo',6,0,nav);Game.plant(s,'seed-b','mijo',7.5,0,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  s.day=5;s.initialPreparation=false;
  return s;
}

test('Growth and Multiply select one living crop each and retain separate VFX in the same plot',()=>{
  const s=farm(),[a,b]=s.plants;
  waterPlant(a);waterPlant(b);
  Game.cast(s,'grow','growth',a.x+.2,a.z,nav);
  Game.cast(s,'multiply','multiply',b.x,b.z,nav);
  assert.deepEqual(s.spells.map(spell=>spell.targetId),[a.id,b.id]);
  assert.deepEqual(s.spells.map(spell=>[spell.x,spell.z]),[[a.x,a.z],[b.x,b.z]]);
  assert.equal(a.multiplyHarvest,undefined);assert.equal(b.multiplyHarvest,true);
  assert.equal(agricultureVfxPlans(s).length,2);
  Game.tick(s,1,nav);
  assert.ok(Math.abs(a.growth-1.5)<1e-8);assert.ok(Math.abs(b.growth-1)<1e-8);
  assert.equal(Game.spellAt(s,'growth',b),undefined);
  assert.equal(Game.spellAt(s,'multiply',a),undefined);
});

test('A dead crop and its replacement never inherit a single-target spell after save and reload',()=>{
  let s=farm(),a=s.plants[0];Game.cast(s,'grow','growth',a.x,a.z,nav);
  a.alive=false;s=deserialize(serialize(s));
  Game.plant(s,'replacement','mijo',a.x,a.z,nav);
  const replacement=s.plants.at(-1);waterPlant(replacement);
  assert.equal(Game.spellAt(s,'growth',replacement),undefined);
  s.cooldowns.growth=0;const before=serialize(s);
  assert.throws(()=>Game.cast(s,'stale','growth',a.x,a.z,nav,{targetId:a.id}),/ya no está disponible/);
  assert.equal(serialize(s),before);
  Game.tick(s,1,nav);assert.ok(Math.abs(replacement.growth-1)<1e-8);
});

test('Empty ground cannot receive agricultural magic and rejected commands leave state intact',()=>{
  const s=farm(),before=serialize(s);
  for(const kind of ['growth','multiply']){
    const draft=Game.previewSpell(s,kind,40,40,nav);
    assert.equal(draft.valid,false);assert.match(draft.reason,/cultivo vivo/);
    assert.throws(()=>Game.cast(s,`empty-${kind}`,kind,40,40,nav),/cultivo vivo/);
  }
  assert.equal(serialize(s),before);
});

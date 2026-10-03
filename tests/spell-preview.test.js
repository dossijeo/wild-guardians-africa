import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {SpellPreview} from '../src/rendering/spell-preview.js';

const nav={placement:()=>({valid:true}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function ready(){
  const s=Game.newGame({slotId:'preview-test',seed:712});Game.resume(s,'intro');
  Game.placeStructure(s,'center',{x:12,z:8},nav);Game.plant(s,'seed','mijo',17,8,nav);
  Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  s.day=5;s.time=0;s.initialPreparation=false;s.dayPlan={done:true};return s;
}
test('Aiming all powers, moving their area, and clearing presentation preserve every simulation field',()=>{
  const s=ready(),scene=new THREE.Scene(),view=new SpellPreview(scene,(x,z)=>x*.1+z*.03),before=serialize(s);
  for(const kind of ['shield','growth','multiply'])for(const x of [0,10,40,1e6]){
    const draft=Game.previewSpell(s,kind,x,20,nav);assert.equal(draft.valid,true);
    assert.equal(draft.radius,Game.spellRadius(kind));view.show(draft);
    assert.equal(view.line.castShadow,false);assert.equal(view.line.visible,true);
    const p=view.geometry.getAttribute('position');
    for(let i=0;i<p.count;i++){
      assert.ok(Math.abs(Math.hypot(p.getX(i),p.getZ(i))-(draft.radius-(i%2)*.14))<.00001);
      const wx=p.getX(i)+view.line.position.x,wz=p.getZ(i)+view.line.position.z;
      assert.ok(Math.abs(p.getY(i)+view.line.position.y-(wx*.1+wz*.03+.08))<.00001);
    }
    const version=p.version;view.show(draft);assert.equal(p.version,version,'A stable preview does not upload vertices every frame');
    assert.equal(serialize(s),before);view.clear();assert.equal(view.line.visible,false);assert.equal(serialize(s),before);
  }
  view.dispose();assert.equal(scene.children.length,0);
});
test('Real-time advancement uses day ×1 and night ×5 while preserving independent cooldowns across reload',()=>{
  let s=ready();Game.cast(s,'growth','growth',10,20,nav);Game.advanceReal(s,1,nav);
  assert.ok(Math.abs(s.cooldowns.growth-89)<1e-8);
  s.time=320;s.nightPlan={done:true,group:[]};Game.cast(s,'shield','shield',30,20,nav);
  const elapsed=s.elapsed;Game.advanceReal(s,1,nav);
  assert.ok(Math.abs(s.elapsed-elapsed-5)<1e-8);assert.ok(Math.abs(s.cooldowns.growth-84)<1e-8);assert.ok(Math.abs(s.cooldowns.shield-85)<1e-8);
  s=deserialize(serialize(s));Game.pause(s,'menu');const before=serialize(s);Game.advanceReal(s,1,nav);assert.equal(serialize(s),before);
});
test('Preview and confirmation agree on overlap, terrain, cooldown, locks, blocking pauses and infrastructure',()=>{
  const scenarios=[
    s=>{s.day=1;},s=>{s.cooldowns.growth=1;},s=>{Game.pause(s,'hiring');},s=>{s.structures[0].status='ruined';},
    s=>{s.spells.push({id:'active',kind:'shield',x:10,z:20,radius:1.95,remaining:10});}
  ];
  for(const change of scenarios){const s=ready();change(s);const before=serialize(s),draft=Game.previewSpell(s,'growth',10,20,nav);assert.equal(draft.valid,false);assert.throws(()=>Game.cast(s,'confirm','growth',10,20,nav),{message:draft.reason});assert.equal(serialize(s),before);}
  for(const point of [[NaN,0],[0,Infinity],[0,0]]){
    const s=ready(),blocked={...nav,terrainValid:()=>false},draft=Game.previewSpell(s,'shield',...point,blocked);
    assert.equal(draft.valid,false);assert.throws(()=>Game.cast(s,'invalid','shield',...point,blocked),{message:draft.reason});assert.equal(s.spells.length,0);
  }
  for(const active of ['shield','growth','multiply'])for(const kind of ['shield','growth','multiply']){
    const s=ready();Game.cast(s,'active',active,10,20,nav);const radius=Game.spellRadius(kind),x=10+Game.spellRadius(active)+radius;
    if(kind===active)s.cooldowns[kind]=0; // Isolate area intersection from cooldown rejection.
    assert.equal(Game.previewSpell(s,kind,x-.001,20,nav).valid,false);
    assert.equal(Game.previewSpell(s,kind,x+.001,20,nav).valid,true);
  }
});
test('Confirmation rechecks a draft after day/night, worker or raid changes without consuming it',()=>{
  for(const kind of ['growth','multiply'])for(const change of [s=>{s.time=300;},s=>{s.raid={animals:[]};},s=>{Game.pause(s,'menu');}]){
    const s=ready(),draft=Game.previewSpell(s,kind,10,20,nav);assert.equal(draft.valid,true);change(s);
    const before=serialize(s);assert.throws(()=>Game.cast(s,'stale',kind,draft.x,draft.z,nav));assert.equal(serialize(s),before);
  }
  const s=ready();assert.equal(Game.previewSpell(s,'multiply',10,20,nav).valid,true);s.workers=[];
  assert.equal(Game.previewSpell(s,'multiply',10,20,nav).valid,false);assert.throws(()=>Game.cast(s,'no-workers','multiply',10,20,nav));
  for(const change of [s=>{s.workers[0].status='home';},s=>{s.workers[0].incapacitated=true;}]){
    const s=ready();change(s);const before=serialize(s);assert.equal(Game.previewSpell(s,'multiply',10,20,nav).valid,false);
    assert.throws(()=>Game.cast(s,'unavailable-workers','multiply',10,20,nav));assert.equal(serialize(s),before);
  }
});
test('Shield preview rejects an animal touching its area without moving or repelling it',()=>{
  const s=ready();s.time=320;s.nightPlan={done:true,group:[]};
  s.raid={animals:[{id:'animal',x:10,z:20,radius:.45,status:'walking'}]};const before=serialize(s);
  assert.equal(Game.previewSpell(s,'shield',12.399,20,nav).valid,false);
  assert.throws(()=>Game.cast(s,'inside','shield',12.399,20,nav),/animal/);
  assert.equal(serialize(s),before);assert.equal(Game.previewSpell(s,'shield',12.401,20,nav).valid,true);
});
test('One confirmation starts the exact duration and cooldown; replay, pause and snapshot do not restart either',()=>{
  for(const [kind,duration,cooldown] of [['shield',20,90],['growth',30,90],['multiply',15,120]]){
    let s=ready();Game.cast(s,'confirm',kind,10,20,nav);
    assert.equal(s.spells[0].remaining,duration);assert.equal(s.cooldowns[kind],cooldown);
    const before=serialize(s);assert.equal(Game.cast(s,'confirm',kind,10,20,nav),false);assert.equal(serialize(s),before);
    Game.tick(s,1,nav);assert.ok(Math.abs(s.spells[0].remaining-(duration-1))<1e-8);assert.ok(Math.abs(s.cooldowns[kind]-(cooldown-1))<1e-8);
    Game.pause(s,'menu');Game.pause(s,'hidden');const paused=serialize(s);Game.advanceReal(s,10,nav);assert.equal(serialize(s),paused);
    s=deserialize(paused);Game.resume(s,'menu');const stillPaused=serialize(s);Game.advanceReal(s,10,nav);assert.equal(serialize(s),stillPaused);
    Game.resume(s,'hidden');Game.tick(s,duration-1,nav);assert.equal(s.spells.length,0);assert.ok(Math.abs(s.cooldowns[kind]-(cooldown-duration))<1e-8);
  }
});

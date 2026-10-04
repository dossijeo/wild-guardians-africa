import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {workVfxPlans,WorkVfx} from '../src/rendering/work-vfx.js';
import {VfxLibrary} from '../src/rendering/vfx.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';
import {renderedTerrainSurface} from '../src/rendering/terrain-surface.js';
import * as Game from '../src/simulation/game.js';
import {isMature} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {numberOf} from '../src/simulation/money.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/content/vfx.json',import.meta.url)));
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(start,end)=>[{x:end.x,z:end.z}]};
function graphics(){const renderer={shadowMap:{enabled:false},getDrawingBufferSize:v=>v.set(800,600)},pipeline=new BuildingDestructionPass(renderer),texture=new THREE.Texture({width:4096,height:2048}),library=new VfxLibrary(catalog,texture),scene=new THREE.Scene();return {library,pipeline,scene,manager:new WorkVfx(library,pipeline,scene,()=>0)};}

test('Initial planting and first water track the four original profile speeds in separate phases',()=>{
  for(const profile of PROFILES){
    const worker={id:'worker',profile:profile.id,status:'acting',taskId:'initial',actionRemaining:5.3/profile.speed},state={tasks:[{id:'initial',kind:'initial',targetId:'plant'}],workers:[worker],plants:[{id:'plant',x:8,z:4}],structures:[]};
    let plan=workVfxPlans(state)[0];assert.equal(plan.id,'dig');assert.equal(plan.key,'worker/initial/plant');assert.ok(Math.abs(plan.time-1.75)<1e-9);
    worker.actionRemaining=1.7/profile.speed;plan=workVfxPlans(state)[0];assert.equal(plan.id,'water');assert.equal(plan.key,'worker/initial/water');assert.ok(Math.abs(plan.time-2.15)<1e-9);assert.equal(plan.x,8);assert.equal(plan.z,4);
    worker.status='fleeing';assert.deepEqual(workVfxPlans(state),[]);worker.status='acting';worker.incapacitated=true;assert.deepEqual(workVfxPlans(state),[]);
  }
});

test('Paid legal work presents native dig, water and harvest without changing state, including pause and reload',()=>{
  let state=Game.newGame({seed:712,slotId:'work-vfx'});Game.resume(state,'intro');Game.placeStructure(state,'center',{x:4,z:0},nav);Game.plant(state,'plant','mijo',8,0,nav);Game.openInitialHiring(state);Game.hire(state,'contract',{olderMale:1});
  let {library,pipeline,scene,manager}=graphics(),seen=new Set(),reloaded=false,paused=false;
  for(let i=0;i<600&&!state.crates.some(c=>c.delivered);i++){
    if(isMature(state.plants[0])&&!state.plants[0].harvestRequested)Game.harvest(state,'harvest',state.plants[0].id);
    Game.tick(state,.5,nav);const before=serialize(state);manager.update(state);assert.equal(serialize(state),before);
    for(const effect of manager.effects.values())seen.add(effect.native.definition.id);
    const water=[...manager.effects.values()].find(e=>e.native.definition.id==='water');
    if(water&&!paused){const time=water.native.time;Game.pause(state,'qa');Game.tick(state,5,nav);manager.update(state);assert.equal(water.native.time,time);Game.resume(state,'qa');paused=true;}
    if(water&&!reloaded){manager.dispose();library.dispose();pipeline.dispose();state=deserialize(serialize(state));({library,pipeline,scene,manager}=graphics());manager.update(state);const reconstructed=[...manager.effects.values()][0];assert.equal(reconstructed.native.definition.id,'water');assert.ok(Math.abs(reconstructed.native.time-water.native.time)<1e-9);reloaded=true;}
  }
  assert.deepEqual([...seen].sort(),['dig','harvest','water']);assert.ok(reloaded&&paused);assert.equal(state.crates.filter(c=>c.delivered).length,1);assert.equal(state.events.filter(e=>e.type==='CropPicked').length,1);assert.equal(manager.effects.size,0);assert.equal(scene.children.length,0);assert.equal(library.instances.size,0);manager.dispose();library.dispose();pipeline.dispose();
});

test('Cancelling a task immediately releases its VFX and leaves no static ribbon or private resources',()=>{
  const {manager,library,pipeline,scene}=graphics(),state={time:0,tasks:[{id:'t',kind:'water',targetId:'p'}],workers:[{id:'w',profile:'olderMale',status:'acting',taskId:'t',actionRemaining:2}],plants:[{id:'p',x:8,z:4}],structures:[]};
  manager.update(state);assert.equal(manager.effects.size,1);state.tasks=[];manager.update(state);assert.equal(manager.effects.size,0);assert.equal(library.instances.size,0);assert.equal(scene.children.length,0);manager.dispose();library.dispose();pipeline.dispose();
});

test('Visual floor sampling matches the exact rendered triangle and diagonal across negative chunk seams',()=>{
  const field={surface:(x,z)=>x*x*.3-z*z*.2+x*z*.1};
  for(const [x,z] of [[.3,.3],[1.2,1.1],[-24.3,47.9],[-48.1,-24.6],[24,48]]){
    const step=1,x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step,u=(x-x0)/step,v=(z-z0)/step,tri=u+v<=1?[[x0,z0,1-u-v],[x0+step,z0,u],[x0,z0+step,v]]:[[x0+step,z0+step,u+v-1],[x0+step,z0,1-v],[x0,z0+step,1-u]];
    const expected=tri.reduce((y,[xx,zz,w])=>y+field.surface(xx,zz)*w,0);assert.ok(Math.abs(renderedTerrainSurface(field,x,z)-expected)<1e-9);
  }
});

test('Committed arrival repair emits one native dust burst at its service point, stable through duplicate presentation, pause and reload',()=>{
 let s=Game.newGame({seed:712,slotId:'repair-dust'});Game.resume(s,'intro');Game.placeStructure(s,'center',{x:4,z:0},nav);Game.plant(s,'crop','mijo',8,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
 const center=s.structures[0];center.hp=560;Game.requestRepair(s,'repair-order',center.id);
 let g=graphics();
 for(let i=0;i<1000&&!s.events.some(e=>e.type==='RepairApplied');i++){
  Game.tick(s,.1,nav);const before=serialize(s);g.manager.update(s);assert.equal(serialize(s),before);
  if(!s.events.some(e=>e.type==='RepairApplied'))assert.ok(![...g.manager.effects.keys()].some(key=>key.startsWith('repair/')));
 }
 const event=s.events.find(e=>e.type==='RepairApplied'),worker=s.workers[0];assert.ok(event);assert.equal(numberOf(s.ledger.balance),541);
 assert.deepEqual(event.presentation,{elapsed:s.elapsed,x:worker.x,z:worker.z,yaw:worker.heading??0});
 const key=`repair/${event.id}`,effect=g.manager.effects.get(key);assert.ok(effect);assert.equal(effect.native.definition.id,'dust');assert.equal(effect.native.rigids.length,4);assert.ok(effect.native.parts.length>0);assert.equal(effect.position.x,worker.x);assert.equal(effect.position.z,worker.z);
 assert.equal(workVfxPlans({...s,events:[event,event]}).filter(p=>p.key===key).length,1);
 Game.tick(s,.12,nav);g.manager.update(s);Game.pause(s,'qa');
 const particles=JSON.stringify({parts:effect.native.parts,rigids:effect.native.rigids}),time=effect.native.time;
 Game.tick(s,5,nav);for(let i=0;i<20;i++)g.manager.update(s);assert.equal(effect.native.time,time);assert.equal(JSON.stringify({parts:effect.native.parts,rigids:effect.native.rigids}),particles);
 const saved=serialize(s);g.manager.dispose();g.library.dispose();g.pipeline.dispose();s=deserialize(saved);g=graphics();g.manager.update(s);
 const restored=g.manager.effects.get(key);assert.equal(restored.native.time,time);const compareParticles=(a,b,path='particles')=>{if(typeof a==='number'&&typeof b==='number')assert.ok(Math.abs(a-b)<1e-4,path);else if(a&&typeof a==='object'){assert.deepEqual(Object.keys(a),Object.keys(b),path);for(const k of Object.keys(a))compareParticles(a[k],b[k],path+'.'+k);}else assert.equal(a,b,path);};compareParticles({parts:restored.native.parts,rigids:restored.native.rigids},JSON.parse(particles));assert.equal(numberOf(s.ledger.balance),541);
 Game.resume(s,'qa');Game.tick(s,4,nav);g.manager.update(s);assert.ok(!g.manager.effects.has(key));assert.equal(numberOf(s.ledger.balance),541);assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,1);
 g.manager.dispose();assert.equal(g.scene.children.length,0);assert.equal(g.library.instances.size,0);g.library.dispose();g.pipeline.dispose();
});

test('Repair dust ignores old, future, failed or malformed presentation instead of resurrecting historical callbacks',()=>{
 const valid={id:'e',type:'RepairApplied',presentation:{elapsed:10,x:5,z:2,yaw:.3}},base={elapsed:10,events:[],workers:[],tasks:[],plants:[],structures:[]};
 assert.equal(workVfxPlans({...base,events:[valid]})[0].id,'dust');
 for(const event of [{...valid,presentation:undefined},{...valid,type:'RepairRequested'},{...valid,presentation:{...valid.presentation,x:NaN}},{...valid,presentation:{...valid.presentation,elapsed:11}},{...valid,id:undefined}])assert.deepEqual(workVfxPlans({...base,events:[event]}),[]);
 assert.deepEqual(workVfxPlans({...base,elapsed:20,events:[valid]}),[]);
});

test('Work manager attaches the worker emitter to the actual native water effect',()=>{
  const {manager}=graphics(),calls=[];manager.waterSource=(id,time,effect)=>{calls.push({id,time,effect});return {position:[0,2,0],direction:[0,0,1]};};
  const state={time:0,elapsed:0,tasks:[{id:'water-task',kind:'water',targetId:'plant'}],plants:[{id:'plant',x:8,z:4}],structures:[],workers:[{id:'worker',profile:'olderMale',status:'acting',taskId:'water-task',actionRemaining:2.9}]};
  manager.update(state);const effect=[...manager.effects.values()][0];assert.ok(calls.length>0);assert.ok(calls.every(c=>c.id==='worker'&&c.effect===effect));assert.ok(effect.native.rigids.length>0);assert.ok(effect.native.rigids.every(r=>Math.abs(r.p[0])<.05&&r.p[1]>1));manager.dispose();
});

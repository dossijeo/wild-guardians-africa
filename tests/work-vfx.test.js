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
    const step=1.5,x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step,u=(x-x0)/step,v=(z-z0)/step,tri=u+v<=1?[[x0,z0,1-u-v],[x0+step,z0,u],[x0,z0+step,v]]:[[x0+step,z0+step,u+v-1],[x0+step,z0,1-v],[x0,z0+step,1-u]];
    const expected=tri.reduce((y,[xx,zz,w])=>y+field.surface(xx,zz)*w,0);assert.ok(Math.abs(renderedTerrainSurface(field,x,z)-expected)<1e-9);
  }
});

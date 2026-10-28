import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BlessingVfx} from '../src/rendering/blessing-vfx.js';
import {declareBlessingInstance,patchBlessingMaterial} from '../src/rendering/blessing-material.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import * as Game from '../src/simulation/game.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {createPlant} from '../src/simulation/crops.js';
import {applyCropImpact} from '../src/simulation/crop-impact-health.js';

function fixture(){
  const state=Game.newGame({seed:712,slotId:'blessing-vfx'}),scene=new THREE.Scene(),created=[];
  state.structures.push({id:'center',kind:'center',status:'intact',hp:100,maxHp:100,x:10,z:10});
  state.plants.push(createPlant('plant-2','maiz',0,0,'center'));
  const library={create(id,pipeline,options){
    const effect=new THREE.Group();effect.native={time:0};effect.advance=dt=>effect.native.time+=dt;
    effect.seek=t=>effect.native.time=t;effect.prepare=()=>false;effect.dispose=()=>{effect.disposed=true;effect.removeFromParent();};
    created.push({id,pipeline,options,effect});return effect;
  }};
  const vfx=new BlessingVfx(library,{},scene,()=>2,state,{height:()=>2});
  return {state,scene,vfx,created};
}
test('resting sparks share one draw and stable buffers; transformation is a brief native VFX with no extra world lights',()=>{
  const {state,scene,vfx,created}=fixture();
  try{
    awakeningState(state).progress=100;Game.bless(state,'bless','plant-2');vfx.update(state);
    assert.equal(created.length,1);assert.equal(created[0].id,'heal');assert.equal(created[0].options.worldLights,false);
    assert.equal(vfx.stats.sources,1);assert.equal(vfx.stats.particles,3);
    const position=vfx.geometry.attributes.position,version=position.version,before=JSON.stringify(state);
    for(let i=0;i<1000;i++)vfx.update(state);
    assert.equal(vfx.stats.uploads,1);assert.strictEqual(vfx.geometry.attributes.position,position);assert.equal(position.version,version);
    assert.equal(JSON.stringify(state),before);assert.equal(created.length,1);
    state.elapsed=3;vfx.update(state);assert.equal(created[0].effect.disposed,true);assert.equal(vfx.effects.size,0);
    assert.equal(scene.children.filter(o=>o.isPoints).length,1);
    vfx.update(state,{x:48,z:-48});assert.equal(vfx.stats.uploads,2);
    assert.equal(vfx.points.position.x+vfx.geometry.attributes.position.getX(0),state.plants[0].x);
  }finally{vfx.dispose();}
  assert.equal(scene.children.length,0);
});
test('source damage is localized, destruction fades sparks and restored sources do not replay transformations',()=>{
  const {state,vfx,created,scene}=fixture();
  try{
    awakeningState(state).progress=100;Game.bless(state,'bless','plant-2');state.elapsed=5;vfx.update(state);
    const restored=new BlessingVfx({create(){throw Error('reload replayed a transformation');}},{},scene,()=>2,state);
    restored.update(state);restored.dispose();
    const plant=state.plants[0],first=applyCropImpact(state,plant,.5);Game.emit(state,'CropHit',{targetId:plant.id,...first});
    assert.equal(vfx.damageAt.get(plant.id),5);assert.equal(created.length,1);
    const last=applyCropImpact(state,plant,3);Game.emit(state,'CropHit',{targetId:plant.id,...last});
    vfx.update(state);assert.equal(vfx.stats.particles,3);assert.equal(vfx.geometry.attributes.aSource.getZ(0),5);
    state.elapsed=5.7;vfx.update(state);assert.equal(vfx.stats.particles,0);assert.equal(vfx.damageAt.size,0);
  }finally{vfx.dispose();}
});
test('object glow composes after grading, supports per-instance eligibility, and leaves ordinary objects untouched',()=>{
  const toon=new AfricanToon(),clock={value:7};
  const shader=()=>({uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader});
  const crop=new THREE.MeshStandardMaterial();crop.userData.blessingInstance=true;
  crop.onBeforeCompile=s=>declareBlessingInstance(s);toon.material(crop);const a=shader();crop.onBeforeCompile(a,{});
  assert.match(a.vertexShader,/vBlessingInfo=iBlessing/);assert.match(a.fragmentShader,/awakeningBurst/);
  assert.ok(a.fragmentShader.indexOf('awakeningBurst')>a.fragmentShader.indexOf('outgoingLight=toLinear4('));
  assert.match(crop.customProgramCacheKey(),/blessed-instance/);
  const wall=new THREE.MeshStandardMaterial();wall.userData.blessingObject={value:new THREE.Vector4(1,0,-1000,0)};
  toon.material(wall);const b=shader();wall.onBeforeCompile(b,{});assert.strictEqual(b.uniforms.uBlessingObject,wall.userData.blessingObject);
  assert.doesNotMatch(b.vertexShader,/iBlessing/);assert.match(wall.customProgramCacheKey(),/blessed-wall/);
  const normal=new THREE.MeshStandardMaterial(),c=shader(),before=c.fragmentShader;
  patchBlessingMaterial(c,normal,clock);assert.equal(c.fragmentShader,before);
  for(const material of [crop,wall,normal])material.dispose();
});

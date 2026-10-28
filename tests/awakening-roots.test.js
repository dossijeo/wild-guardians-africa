import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {awakeningRootPaths,rasterizeAwakeningRoots} from '../src/rendering/awakening-roots-data.js';
import {AwakeningRoots,patchAwakeningRoots} from '../src/rendering/awakening-roots.js';
import {AfricanToon} from '../src/rendering/african-toon.js';
import {createPlant} from '../src/simulation/crops.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {withRenderOrigin} from '../src/rendering/render-origin.js';
import {chunkBounds} from '../src/rendering/water-source.js';
import {applyCropImpact} from '../src/simulation/crop-impact-health.js';
import * as Game from '../src/simulation/game.js';
const source={id:'plant-10',species:'maiz',x:0,z:0,alive:true,blessing:{}};
const normal=(x,z,id='plant-20')=>({id,x,z,alive:true});
test('root paths are deterministic, local, sparse and point toward actual beneficiaries',()=>{
  const plants=[normal(1.5,0),normal(-1.5,0,'plant-21'),normal(0,1.5,'plant-22'),normal(20,20,'remote')];
  const rng=Math.random;let paths;
  try{Math.random=()=>{throw Error('visual paths consumed RNG');};paths=awakeningRootPaths(source,plants);}finally{Math.random=rng;}
  assert.deepEqual(paths,awakeningRootPaths(source,plants));assert.equal(paths.length,6);
  for(const path of paths)for(const p of path)assert.ok(Math.hypot(p.x,p.z)<2.4);
  assert.ok(Math.abs(paths[0].at(-1).x-1.35)<1e-8);assert.equal(paths[0].at(-1).strength,.35);
  const mask=rasterizeAwakeningRoots(paths,chunkBounds(0,0));
  assert.ok(mask.some(v=>v>0));assert.ok(mask.filter(v=>v>0).length<mask.length*.01);
  assert.deepEqual(mask,rasterizeAwakeningRoots(paths,chunkBounds(0,0)));
  assert.ok(rasterizeAwakeningRoots(paths,chunkBounds(8,8)).every(v=>v===0));
});
test('paths cross terrain chunk seams in global coordinates and follow the existing terrain fragment surface',()=>{
  const paths=awakeningRootPaths({...source,x:23.5},[normal(25,0)]);
  assert.ok(rasterizeAwakeningRoots(paths,chunkBounds(0,0)).some(v=>v>0));
  assert.ok(rasterizeAwakeningRoots(paths,chunkBounds(1,0)).some(v=>v>0));
  const shader={uniforms:{},fragmentShader:'void main(){ vec3 outgoingLight; #include <opaque_fragment> }'};
  patchAwakeningRoots(shader,{});assert.match(shader.fragmentShader,/vToonWorld.xz-uAwakeningBounds.xy/);
  assert.doesNotMatch(shader.fragmentShader,/for\s*\(/,'fragment work does not loop over sources or hebras');
});
function fixture(){
  const s=Game.newGame({seed:712,slotId:'roots'});
  s.structures.push({id:'center',kind:'center',status:'intact',hp:100,maxHp:100,x:10,z:10});
  s.plants.push(createPlant('plant-2','maiz',0,0,'center'),createPlant('plant-3','mijo',1.5,0,'center'));
  awakeningState(s).progress=100;Game.bless(s,'source',s.plants[0].id);return s;
}
test('masks rebuild only from local events, reuse one shared texture per terrain tile, and fade on destruction',()=>{
  const s=fixture(),layer=new AwakeningRoots(s,{resolution:128}),before=JSON.stringify(s);
  try{
    const uniforms=layer.uniforms(0,0);assert.strictEqual(layer.uniforms(0,0),uniforms);
    const remote=layer.uniforms(3,3);layer.flush();assert.equal(JSON.stringify(s),before);
    assert.equal(layer.stats.builds,1);assert.equal(remote.uAwakeningOn.value,0);
    assert.equal(uniforms.uAwakeningOn.value,1);
    const data=uniforms.uAwakeningMap.value.image.data;
    assert.ok(data.some(v=>v>0));assert.equal(data[0],data[1],'restored sources do not replay their awakening');
    for(let i=0;i<1000;i++)layer.flush();assert.equal(layer.stats.builds,1);
    Game.emit(s,'SpatialTest');layer.flush();assert.equal(layer.stats.builds,1);
    const hit=applyCropImpact(s,s.plants[0],3);Game.emit(s,'CropHit',{targetId:s.plants[0].id,...hit});
    layer.flush();assert.equal(layer.stats.builds,2);
    const fade=uniforms.uAwakeningMap.value.image.data;
    assert.ok(fade.some((v,i)=>i%2===1&&v>0));assert.ok(fade.every((v,i)=>i%2===1||v===0));
    s.elapsed+=.7;layer.flush();assert.equal(uniforms.uAwakeningOn.value,0);assert.equal(layer.stats.bytes,0);
  }finally{layer.dispose();}
});
test('terrain quality replacement retains uniforms until the last material owner is disposed',()=>{
  const layer=new AwakeningRoots(fixture(),{resolution:64});
  try{
    const uniforms=layer.uniforms(0,0),a=new THREE.MeshStandardMaterial(),b=new THREE.MeshBasicMaterial();
    layer.retain(uniforms,a);layer.retain(uniforms,b);layer.flush();assert.ok(layer.stats.bytes>0);
    a.dispose();assert.equal(layer.tiles.size,1);b.dispose();assert.equal(layer.tiles.size,0);assert.equal(layer.stats.bytes,0);
  }finally{layer.dispose();}
});
test('root mask bounds participate in the same relative-origin window as the real terrain',()=>{
  const s=fixture(),layer=new AwakeningRoots(s),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  try{
    const u=layer.uniforms(12,8),before=u.uAwakeningBounds.value.clone();
    withRenderOrigin({scene,camera,origin:{x:576,z:384},minSize:()=>layer.bounds()},()=>{
      assert.equal(u.uAwakeningBounds.value.x,-24);assert.equal(u.uAwakeningBounds.value.y,-24);
    });assert.deepEqual(u.uAwakeningBounds.value,before);
  }finally{layer.dispose();}
});
test('root integration composes with both original ground quality paths and excludes ordinary objects',()=>{
  const layer=new AwakeningRoots(fixture()),toon=new AfricanToon();
  try{
    for(const Material of [THREE.MeshBasicMaterial,THREE.MeshStandardMaterial]){
      const material=new Material({vertexColors:true});material.userData.toonGround=true;
      material.userData.biomeGround={...layer.uniforms(0,0),uGroundLayered:{value:0}};
      toon.material(material);
      const shader={uniforms:{},vertexShader:THREE.ShaderLib[material.isMeshBasicMaterial?'basic':'standard'].vertexShader,
        fragmentShader:THREE.ShaderLib[material.isMeshBasicMaterial?'basic':'standard'].fragmentShader};
      material.onBeforeCompile(shader,{});assert.match(shader.fragmentShader,/rootMask/);
      assert.strictEqual(shader.uniforms.uAwakeningClock,layer.clock);assert.match(material.customProgramCacheKey(),/awakening-roots/);
      material.dispose();
    }
    const material=new THREE.MeshStandardMaterial();toon.material(material);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    material.onBeforeCompile(shader,{});assert.doesNotMatch(shader.fragmentShader,/uAwakeningMap/);material.dispose();
  }finally{layer.dispose();}
});

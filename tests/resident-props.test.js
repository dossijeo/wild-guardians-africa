import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {refreshResidentProps,sameSuppressions} from '../src/rendering/resident-props.js';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';
import {WorldScene} from '../src/rendering/scene.js';

function fixture(count){
  const geometry=new THREE.BoxGeometry(2,3,2);geometry.computeBoundingBox();
  const material=new THREE.MeshStandardMaterial(),levels=[{geometry,material}],chunks=new Map();
  const build=(group,slot,instances)=>{if(instances.length)createAssetLod(group,levels,instances,{group:0},slot);};
  for(let i=0;i<count;i++){
    const group=new THREE.Group(),ground=new THREE.Mesh(new THREE.PlaneGeometry(),material),water=new THREE.Mesh(new THREE.PlaneGeometry(),material);
    ground.userData.ground=true;water.userData.nativeFluid='chunk';group.add(ground,water);
    const p={id:'prop-'+i,x:i*48,y:0,z:0,yaw:0,sx:1,sy:1,sz:1};
    group.userData.nativeChunkOrigin=[i*48,0];group.position.x=i*48;
    group.userData.propSources=[[p],[]];group.userData.contactInstances=[[p],[]];build(group,0,[p]);chunks.set(String(i),group);
  }
  return {chunks,build,close(){for(const g of chunks.values()){for(const b of g.userData.lodBatches){b.shadow.dispose();for(const m of b.meshes){m.dispose();if(m.geometry!==geometry)m.geometry.dispose();}}for(const m of g.children)if(!m.isInstancedMesh)m.geometry.dispose();}geometry.dispose();material.dispose();}};
}

for(const count of [25,49])test(`unchanged actions retain all ${count} resident grounds, water, batches and shadow buffers`,()=>{
  const f=fixture(count),before=[...f.chunks.values()].map(g=>[...g.children]),batches=[...f.chunks.values()].map(g=>g.userData.lodBatches[0]);
  assert.deepEqual(refreshResidentProps(f.chunks,new Set(),()=>assert.fail('unnecessary slot generation')),{chunks:0,slots:0});
  [...f.chunks.values()].forEach((g,i)=>{assert.deepEqual(g.children,before[i]);assert.equal(g.userData.lodBatches[0],batches[i]);});f.close();
});

test('suppression updates one asset slot, its shadow/coverage/contact population and bounds without retiring terrain; restoration remains possible',()=>{
  const f=fixture(25),g=f.chunks.get('7'),ground=g.children[0],water=g.children[1],batch=g.userData.lodBatches[0],source=g.userData.propSources[0];
  let shadowDisposed=0,coverageDisposed=0,groundDisposed=0;batch.shadow.addEventListener('dispose',()=>shadowDisposed++);batch.meshes[0].geometry.addEventListener('dispose',()=>coverageDisposed++);ground.geometry.addEventListener('dispose',()=>groundDisposed++);
  g.userData.nativeAssetBounds=new THREE.Box3();
  assert.deepEqual(refreshResidentProps(f.chunks,new Set(['prop-7']),f.build),{chunks:1,slots:1});
  assert.equal(g.children[0],ground);assert.equal(g.children[1],water);assert.equal(groundDisposed,0);assert.equal(shadowDisposed,1);assert.equal(coverageDisposed,1);
  assert.equal(g.userData.lodBatches.length,0);assert.deepEqual(g.userData.contactInstances[0],[]);assert.equal(g.userData.propSources[0],source);assert.equal(g.userData.nativeAssetBounds,undefined);
  assert.deepEqual(refreshResidentProps(f.chunks,new Set(),f.build),{chunks:1,slots:1});
  const camera=new THREE.PerspectiveCamera();camera.position.set(7*48,5,4);updateAssetLods(f.chunks,camera,'media');
  assert.equal(g.userData.lodBatches[0].shadow.count,1);assert.equal(g.userData.contactInstances[0][0].id,'prop-7');f.close();
});

test('navigation suppression changes invalidate contacts and hands only when resident props change; offscreen suppressions never force streaming',()=>{
  const f=fixture(25);let contacts=0,shadows=0;
  const world={nav:{suppressed:new Set(),config:{layers:[]}},prototypes:[],chunks:f.chunks,chunkRevision:9,handStaticBoxes:[],nearBounds:[0,0,48,48],buildPropSlot:f.build,contacts:{update(){contacts++;}},releaseNativeShadow:{cache:{invalidate(){shadows++;}}}};
  const sync=()=>WorldScene.prototype.syncResidentProps.call(world);
  assert.deepEqual(sync(),{chunks:0,slots:0});world.nav.suppressed=new Set(['remote-prop']);assert.deepEqual(sync(),{chunks:0,slots:0});
  assert.equal(world.chunkRevision,9);assert.equal(contacts,0);assert.equal(shadows,0);
  world.nav.suppressed=new Set(['remote-prop','prop-3']);assert.deepEqual(sync(),{chunks:1,slots:1});assert.equal(world.chunkRevision,10);assert.equal(world.handStaticBoxes,null);assert.equal(contacts,1);assert.equal(shadows,1);
  assert.deepEqual(sync(),{chunks:0,slots:0});assert.equal(contacts,1);assert.ok(sameSuppressions(new Set(['a','b']),new Set(['b','a'])));assert.ok(!sameSuppressions(new Set(['a']),new Set(['b'])));f.close();
});

test('an affected asset pool retires its material and instance buffer while preserving shared water geometry',()=>{
  const f=fixture(1),g=f.chunks.get('0'),geometry=new THREE.PlaneGeometry(),material=new THREE.MeshStandardMaterial(),pool=new THREE.InstancedMesh(geometry,material,1);
  pool.userData.nativeFluid='asset';pool.userData.nativePropSlot=0;g.add(pool);
  let matrices=0,materials=0,vertices=0;pool.addEventListener('dispose',()=>matrices++);material.addEventListener('dispose',()=>materials++);geometry.addEventListener('dispose',()=>vertices++);
  refreshResidentProps(f.chunks,new Set(['prop-0']),f.build);
  assert.equal(pool.parent,null);assert.equal(matrices,1);assert.equal(materials,1);assert.equal(vertices,0);geometry.dispose();f.close();
});

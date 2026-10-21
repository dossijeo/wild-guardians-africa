import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {EngineEventsWildRenderer} from '../src/rendering/wild-renderer/engine-events.js';
import {emit} from '../src/simulation/game.js';
import {EnginePackedWildRenderer} from '../src/rendering/wild-renderer/engine-packed.js';

for(const Candidate of [EnginePackedWildRenderer,EngineEventsWildRenderer])for(const mode of [0,1,2])test(`${Candidate.name} nativeLod=${mode}: native registration and partial replacement without JS record reads`,async()=>{
 const {instance}=await WebAssembly.instantiate(await readFile(new URL('../src/rendering/wild-renderer/core.wasm',import.meta.url)),{wasi_snapshot_preview1:{proc_exit(){throw Error('exit');}}});
 const suppressed=new Set(),state={sequence:1,events:[],suppressed:[]},renderer=new Candidate(instance.exports,Candidate===EngineEventsWildRenderer?state:()=>suppressed);
 const nativeLod=mode>0;renderer.nativeLod=nativeLod;renderer.lightweightLod=mode===2;
 const records=new Uint8Array(80),view=new DataView(records.buffer);
 for(let i=0;i<2;i++){
  [i+3,i+5,2,1,1,.5].forEach((v,k)=>view.setFloat32(i*40+k*4,v,true));
  [4,0,i,0].forEach((v,k)=>view.setInt32(i*40+24+k*4,v,true));
 }
 const group=new THREE.Group();group.updateMatrixWorld();
 group.userData.propSources={qaPacked:{format:'wild-engine-props-v1',count:2,records}};
 const geometry=new THREE.BoxGeometry();geometry.computeBoundingSphere();
 const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),2);
 const instances=new Proxy({length:2},{get(target,key){if(/^\d+$/.test(String(key)))throw Error('JS instance traversal');return target[key];}});
 const batch={instances,slot:4,group:0,meshes:[mesh],prototype:{size:[1,1,1],centerY:0,role:'prop'},levels:[{geometry}],chunkOrigin:[0,0],orders:[[0,1]]};
 const entry={group,batch,mesh,level:0};
 if(mode===2){assert.deepEqual(renderer.nativeLodBins(batch,group,[0,0,0],'baja'),[[0,1],[],[]]);assert.equal(renderer.sources.size,0,'LOD must not register pack data');assert.equal(renderer.lodSources.size,1);renderer.metrics={};}
 const source=renderer.source(entry);
 assert.equal(source.local[12],3);assert.equal(source.local[28],4);
 assert.equal(renderer.metrics.nativePropRegistrations,1);
 if(nativeLod){assert.deepEqual(renderer.nativeLodBins(batch,group,[0,0,0],'baja'),[[0,1],[],[]]);assert.deepEqual(renderer.nativeLodBins(batch,group,[20000,0,0],'baja'),[[],[],[]]);}
 renderer.metrics={};renderer.frame++;renderer.source(entry);
 assert.equal(renderer.metrics.engineCopiedBytes??0,0);
 assert.equal(renderer.metrics.nativePropRegistrations??0,0);
 mesh.dispose();assert.equal(renderer.sources.size,0);assert.equal(renderer.lodSources.size,0);
 // Match resident-props' event boundary: dispose the old slot and register
 // its replacement, while retaining the existing chunk's packed data.
 suppressed.add('spatial:0:0:0');state.suppressed.push('spatial:0:0:0');emit(state,'PlacementCommitted');
 const replacementMesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),1);
 const replacement={...batch,meshes:[replacementMesh],instances:new Proxy({length:1},{get(target,key){if(/^\d+$/.test(String(key)))throw Error('JS instance traversal');return target[key];}}),orders:[[0]]};
 renderer.metrics={};
 const changed=renderer.source({...entry,batch:replacement,mesh:replacementMesh});
 assert.equal(changed.local[12],4);
 assert.equal(renderer.metrics.engineCopiedBytes,12); // changed suppression ID only
 assert.equal(renderer.sources.size,1);
 renderer.dispose();assert.equal(renderer.liveBytes,0);
});

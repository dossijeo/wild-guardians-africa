import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,BoxGeometry,PlaneGeometry,MeshBasicMaterial,MeshStandardMaterial,DoubleSide} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {createWebGpuCropRoster} from '../src/rendering/webgpu-crop-roster.js';
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
import {assertNativeTerrainPresentationSupport} from '../src/rendering/native-terrain-presentation-support.js';
import {cropSpec} from '../src/simulation/rules.js';

async function fixture({resident=true,count=2}={}){
 const oldFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>[{source:'Cultivos',url:'/crop.glb'}]});
 const scene=new Scene(),model=new Group(),geometry=new BoxGeometry(),material=new MeshStandardMaterial(),groundMaterial=new MeshBasicMaterial({side:DoubleSide}),grounds=[],map=new Map();
 for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){const mesh=new Mesh(geometry,material);mesh.userData={cropIndex:crop,stage,height:stage,foliageRadius:1};model.add(mesh);}
 const ground=(cx,y)=>{const geometry=new PlaneGeometry(48,48);geometry.rotateX(-Math.PI/2);const mesh=new Mesh(geometry,groundMaterial);mesh.position.set(cx*48,y,0);grounds.push(mesh);return mesh;};
 const first=ground(0,1),other=ground(1,9),future=ground(0,4);if(resident)map.set('0,0',first);map.set('1,0',other);
 const plants=Array.from({length:count},(_,i)=>({id:'plant-'+(i+1),species:'maiz',x:i===0?1:48+i*.2,z:1,rotation:.1*i,alive:true,growth:cropSpec('maiz').growth_seconds})),state={elapsed:10,plants},residency={get:(x,z)=>map.get(`${x},${z}`)??null};
 const registry=createWebGpuResourceRegistry(),requests=[],admission={prepare:async()=>{},prepareManyAndPublish(){},async prepareTicket(object){requests.push(object);return {valid:()=>true,validAfterAttach:()=>true};},deferRelease(_object,release){release();}},coordinator=createChunkPublicationCoordinator({admission}),renderer={backend:{isWebGPUBackend:true},library:{fromMaterial:source=>new MeshStandardNodeMaterial().copy(source)}};
 const roster=createWebGpuCropRoster({scene,state,residency,renderer,pipelineAdmission:admission,resourceRegistry:registry,loadCropModel:async()=>({scene:model})});await roster.prepare();for(let n=0;n<5;n++)await new Promise(resolve=>setImmediate(resolve));
 const view={get:(x,z)=>x===0&&z===0?future:residency.get(x,z),changedKeys:new Set(['0,0'])};
 let order=0;const pair=side=>({key:'0,0',epoch:'e',revision:order,publicationOrder:order,side,object:new Group(),signal:new AbortController().signal,eventRoots(){return [this.object];},presentation:()=>({show:[],hide:[]}),activate:()=>true,attach(){},rollback(){},finalize:()=>({retire(){},notify(){}}),rollbackFinalized(){},cancel(){}});
 return {scene,state,residency,view,future,map,roster,registry,requests,coordinator,async batch(parts){order++;return coordinator.prepareBatch([pair('terrain'),pair('biome')],{scene,dependents:parts});},dispose(){roster.dispose();coordinator.dispose();registry.dispose();for(const mesh of grounds)mesh.geometry.dispose();groundMaterial.dispose();globalThis.fetch=oldFetch;}};
}
const crops=scene=>scene.children.filter(mesh=>mesh.isInstancedMesh&&mesh.geometry.hasAttribute('iGrowth'));

test('crop terrain capture reuses the batch and changes only the required instance data',async()=>{
 const f=await fixture();try{const mesh=crops(f.scene)[0],geometry=mesh.geometry,material=mesh.material,attribute=mesh.instanceMatrix,original=attribute.array,growth=geometry.getAttribute('iGrowth').array,blessing=geometry.getAttribute('iBlessing').array,parts=await f.roster.prepareTerrainSupport(f.view),batch=await f.batch(parts);
  assert.doesNotThrow(()=>assertNativeTerrainPresentationSupport({state:f.state,residency:f.residency,view:f.view,participants:parts}));
  batch.capturePresentation(()=>{assert.equal(mesh.instanceMatrix.array[13],4);assert.equal(mesh.instanceMatrix.array[29],9);assert.equal(geometry.getAttribute('iGrowth').array,growth);assert.equal(geometry.getAttribute('iBlessing').array,blessing);});
  assert.equal(attribute.array,original);assert.equal(original[13],1);assert.equal(f.roster.pickBounds()[0].y,1);f.map.set('0,0',f.future);batch.commit();f.roster.sync();assert.equal(crops(f.scene)[0],mesh);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(mesh.instanceMatrix,attribute);assert.equal(mesh.instanceMatrix.array[13],4);assert.equal(f.registry.status().owned.filter(item=>item.namespace==='crop-terrain-preparation').length,0);
 }finally{f.dispose();}
});

test('retirement compacts all instance channels together and can readmit into the same batch',async()=>{
 const f=await fixture();try{const mesh=crops(f.scene)[0];f.view.get=(x,z)=>x===0?null:f.residency.get(x,z);let parts=await f.roster.prepareTerrainSupport(f.view),batch=await f.batch(parts);batch.capturePresentation(()=>{assert.equal(mesh.count,1);assert.ok(mesh.instanceMatrix.array[12]>48);assert.equal(mesh.geometry.getAttribute('iGrowth').array[3],2);});assert.equal(mesh.count,2);f.map.delete('0,0');batch.commit();assert.equal(mesh.count,1);
  f.view.get=(x,z)=>x===0?f.future:f.residency.get(x,z);parts=await f.roster.prepareTerrainSupport(f.view);batch=await f.batch(parts);f.map.set('0,0',f.future);batch.commit();assert.equal(crops(f.scene)[0],mesh);assert.equal(mesh.count,2);assert.equal(mesh.instanceMatrix.array[13],4);
 }finally{f.dispose();}
});

test('new residency stages the actual missing batch hidden and cancellation releases only its reservation',async()=>{
 const f=await fixture({resident:false,count:1});try{assert.equal(crops(f.scene).length,0);const parts=await f.roster.prepareTerrainSupport(f.view),mesh=crops(f.scene)[0],batch=await f.batch(parts);assert.equal(mesh.visible,false);assert.equal(f.roster.status().confirmedPlants,0);batch.capturePresentation(()=>{assert.equal(mesh.count,1);assert.equal(mesh.instanceMatrix.array[13],4);});assert.equal(mesh.count,0);batch.abort();assert.equal(crops(f.scene).length,0);assert.equal(f.registry.status().owned.some(item=>item.namespace==='crop-terrain-preparation'||item.namespace==='crop-batch'),false);}finally{f.dispose();}
});

test('a changed crop read set prevents physical admission and leaves the old arrays intact',async()=>{
 const f=await fixture();try{const mesh=crops(f.scene)[0],array=mesh.instanceMatrix.array,parts=await f.roster.prepareTerrainSupport(f.view),batch=await f.batch(parts);f.state.plants[0].growth=1;assert.equal(batch.valid(),false);assert.throws(()=>batch.commit(),/stale/);assert.equal(mesh.instanceMatrix.array,array);assert.equal(array[13],1);}finally{f.dispose();}
});

test('capacity growth prepares one hidden replacement and restores the old batch on cancellation',async()=>{
 const f=await fixture();try{const old=crops(f.scene)[0];for(let i=0;i<8;i++)f.state.plants.push({...f.state.plants[0],id:'extra-'+i,x:2+i*.1});const parts=await f.roster.prepareTerrainSupport(f.view),next=crops(f.scene).find(mesh=>mesh!==old),batch=await f.batch(parts);assert.ok(next.instanceMatrix.count>=10);assert.equal(next.visible,false);assert.equal(old.visible,true);batch.capturePresentation(()=>{assert.equal(old.visible,false);assert.equal(next.visible,true);assert.equal(next.count,10);});assert.equal(old.visible,true);assert.equal(next.visible,false);batch.abort();assert.equal(next.parent,null);assert.equal(old.parent,f.scene);assert.equal(old.visible,true);assert.equal(f.registry.status().owned.filter(item=>item.namespace==='crop-terrain-preparation').length,0);}finally{f.dispose();}
});

test('capacity growth commits the replacement through the existing owner and retires the old batch',async()=>{
 const f=await fixture();try{const old=crops(f.scene)[0];for(let i=0;i<8;i++)f.state.plants.push({...f.state.plants[0],id:'extra-'+i,x:2+i*.1});const parts=await f.roster.prepareTerrainSupport(f.view),next=crops(f.scene).find(mesh=>mesh!==old),batch=await f.batch(parts);f.map.set('0,0',f.future);batch.commit();assert.equal(old.parent,null);assert.equal(next.parent,f.scene);assert.equal(next.count,10);f.roster.sync();assert.equal(crops(f.scene)[0],next);assert.equal(f.registry.status().owned.filter(item=>item.namespace==='crop-terrain-preparation').length,0);}finally{f.dispose();}
});

test('later batch failure restores crop rows and metadata without disposing their meshes',async()=>{
 const f=await fixture();try{const mesh=crops(f.scene)[0],array=mesh.instanceMatrix.array,parts=await f.roster.prepareTerrainSupport(f.view),object=new Group(),fail={object,signal:new AbortController().signal,valid:()=>true,eventRoots:()=>[object],activate:()=>true,attach(){},rollback(){},finalize(){throw Error('later finalization failed');},rollbackFinalized(){},cancel(){}};const batch=await f.batch([...parts,fail]);assert.throws(()=>batch.commit(),/later finalization/);assert.equal(mesh.parent,f.scene);assert.equal(mesh.instanceMatrix.array,array);assert.equal(array[13],1);assert.equal(mesh.count,2);}finally{f.dispose();}
});

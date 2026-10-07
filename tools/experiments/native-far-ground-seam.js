import * as THREE from 'three';
import {FarGroundSeamStream} from './far-ground-seam-stream.js';
import {farGroundColorUvs} from './far-ground-color-map.js';

// Private opt-in owner. Updates compare a discrete rectangle; terrain sampling
// happens only in a cancellable worker. Previously prepared geometry is kept
// until the replacement is complete, with borrowed map/material inputs.
export function attachNativeGroundSeam(candidate,ground,world,{createMaterial,streamFactory=()=>new FarGroundSeamStream()}={}){
 if(!ground.colorMap||typeof createMaterial!=='function')throw Error('Mapped ground required for seam');
 const emptyPromise=Promise.resolve(null),sourceSeed=world.nav.config.seed,sourceBiome=world.nav.config.biome;
 let closed=false,generation=0,current=null,requestedBounds=null,pending=null,stream=streamFactory(),lost=world.renderer.getContext().isContextLost(),preparedPromise=emptyPromise;
 const stats={requests:0,adopted:0,stale:0,vertices:0,bytes:0,buildMs:0,errors:[]};candidate.groundSeamStats=stats;
 const sourceConfig=JSON.stringify(world.nav.config);
 const canvas=world.renderer.domElement;
 const release=mesh=>{if(!mesh)return;mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();};
 const onLost=()=>{lost=true;generation++;stream.dispose();pending=null;requestedBounds=null;};
 const onRestored=()=>{lost=false;if(!closed)stream=streamFactory();};
 canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 function update(){
  if(closed||world.disposed||lost)return emptyPromise;
  if(world.nav.config.seed!==sourceSeed||world.nav.config.biome!==sourceBiome)return Promise.reject(Error('Ground seam world configuration changed'));
  const bounds=world.nearBounds;if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite))return Promise.reject(Error('Invalid adopted seam bounds'));
  if(requestedBounds&&bounds[0]===requestedBounds[0]&&bounds[1]===requestedBounds[1]&&bounds[2]===requestedBounds[2]&&bounds[3]===requestedBounds[3])return pending??preparedPromise;
  if(JSON.stringify(world.nav.config)!==sourceConfig)return Promise.reject(Error('Ground seam world configuration changed'));
  const next=bounds.join(':');requestedBounds=[...bounds];const epoch=++generation;stats.requests++;
  const request={config:world.nav.config,nearBounds:[...bounds],ground:{positions:ground.positions,indices:ground.indices,bounds:ground.bounds,nx:ground.nx,nz:ground.nz,contactCells:ground.contactCells}};
  pending=stream.request(next,request).then(result=>{
   if(!result||closed||world.disposed||epoch!==generation||lost||world.nearBounds.join(':')!==next||JSON.stringify(world.nav.config)!==sourceConfig){stats.stale++;if(epoch===generation)requestedBounds=null;return null;}
   const data=result.data,geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(farGroundColorUvs(data.positions,ground.colorMap),2));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
   let material;try{material=createMaterial();}catch(error){geometry.dispose();throw error;}
   const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.userData.farGround=true;mesh.userData.farGroundSeam=true;mesh.userData.materialRegistryExcluded=true;
   candidate.impostors.add(mesh);release(current);current=mesh;stats.adopted++;stats.vertices=data.positions.length/3;stats.bytes=data.positions.byteLength+data.indices.byteLength+geometry.attributes.uv.array.byteLength;stats.buildMs=result.buildMs;
   preparedPromise=Promise.resolve(mesh);return mesh;
  }).catch(error=>{if(closed||epoch!==generation)return null;requestedBounds=null;stats.errors.push(String(error));throw error;}).finally(()=>{if(epoch===generation)pending=null;});
  return pending;
 }
 return {update,stats,dispose(){if(closed)return;closed=true;generation++;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);stream.dispose();release(current);current=null;pending=null;preparedPromise=emptyPromise;}};
}

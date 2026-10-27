import * as THREE from 'three';
import {cloneRuntimeMaterial} from '../../src/rendering/clone-runtime-material.js';

export function smoothFarTransitionsEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('farTransitions')==='smooth';
}

// Preparation must precede WebGLRenderer's object traversal/upload stage.
// Scene-scoped ownership also covers more than one species and region in flight.
const sceneOwners=new WeakMap();
function registerScene(scene,owner){
 let entry=sceneOwners.get(scene);
 if(!entry){
  const previous=scene.onBeforeRender;entry={previous,owners:new Set()};
  entry.hook=function(...args){previous.apply(this,args);for(const item of entry.owners)item.prepare(args[2]);};
  sceneOwners.set(scene,entry);scene.onBeforeRender=entry.hook;
 }
 entry.owners.add(owner);
 return ()=>{entry.owners.delete(owner);if(!entry.owners.size){if(scene.onBeforeRender===entry.hook)scene.onBeforeRender=entry.previous;sceneOwners.delete(scene);}};
}

export function createSmoothFarImpostor(mesh,scene){
 const originalRenderOrder=mesh.renderOrder;
 // Transparent water spans whole chunks, so object-centre sorting can draw
 // it over above-water foliage. Draw fading vegetation after those surfaces.
 mesh.renderOrder=1;
 const source=mesh.geometry,base=mesh.material,geometry=new THREE.InstancedBufferGeometry();
 if(source.index)geometry.setIndex(new THREE.BufferAttribute(source.index.array,source.index.itemSize,source.index.normalized));
 for(const [name,a]of Object.entries(source.attributes))geometry.setAttribute(name,a.isInstancedBufferAttribute?new THREE.InstancedBufferAttribute(new a.array.constructor(a.array.length),a.itemSize,a.normalized).setUsage(THREE.DynamicDrawUsage):new THREE.BufferAttribute(a.array,a.itemSize,a.normalized));
 geometry.instanceCount=source.instanceCount;geometry.setDrawRange(source.drawRange.start,source.drawRange.count);
 function material(pass){
  const m=base.clone();m.uniforms=base.uniforms;m.transparent=pass==='partial';m.depthWrite=pass==='opaque';m.side=THREE.FrontSide;m.forceSinglePass=true;
  m.onBeforeCompile=function(shader,renderer){
   base.onBeforeCompile.call(this,shader,renderer);
   const anchor='if(coverageThreshold(gl_FragCoord.xy)<1.-vMix*vDensityFade)discard;';
   if(!shader.fragmentShader.includes(anchor))throw Error('Smooth far coverage anchor missing');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,'if(vMix*vDensityFade<.002)discard;'+(pass==='opaque'?'if(vMix*vDensityFade<.999)discard;':'if(vMix*vDensityFade>=.999)discard;'));
   shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\n gl_FragColor.a=clamp(vMix*vDensityFade,0.,1.);');
  };
  m.customProgramCacheKey=()=>base.customProgramCacheKey()+'|smooth-far-'+pass+'-v1';return m;
 }
 const partial=material('partial'),opaqueMaterial=material('opaque'),opaque=new THREE.Mesh(geometry,opaqueMaterial);
 opaque.name='smooth-far-opaque';opaque.frustumCulled=false;mesh.add(opaque);mesh.geometry=geometry;mesh.material=partial;
 const count=source.attributes.aTreeBase.count,indices=Array.from({length:count},(_,i)=>i),depth=new Float64Array(count);let signature='',closed=false;
 const staticVersions=new Map();let indexVersion=-1;
 const stats=globalThis.qaSmoothSortStats??=( {calls:0,repacked:0,bytes:0} );
 const owner={prepare(camera){
  stats.calls++;
  if(closed)return;
  geometry.instanceCount=source.instanceCount;geometry.setDrawRange(source.drawRange.start,source.drawRange.count);
  // Hull toggles mutate shared CPU arrays, but each geometry owns GPU attributes.
  for(const [name,a]of Object.entries(source.attributes))if(!a.isInstancedBufferAttribute&&staticVersions.get(name)!==a.version){geometry.attributes[name].needsUpdate=true;staticVersions.set(name,a.version);}
  if(source.index&&indexVersion!==source.index.version){geometry.index.needsUpdate=true;indexVersion=source.index.version;}
  const attrs=Object.entries(source.attributes).filter(([,a])=>a.isInstancedBufferAttribute),view=camera.matrixWorldInverse.elements;
  const next=attrs.map(([,a])=>a.version).join(',')+'|'+view.join(',');if(next===signature)return;signature=next;
  const pos=source.attributes.aTreeBase,scale=source.attributes.aTreeScale,height=base.uniforms.uSize.value.y;
  for(let i=0;i<count;i++)depth[i]=view[2]*pos.getX(i)+view[6]*(pos.getY(i)+height*scale.getY(i)*.5)+view[10]*pos.getZ(i);
  indices.sort((a,b)=>depth[a]-depth[b]||pos.getX(a)-pos.getX(b)||pos.getZ(a)-pos.getZ(b)||pos.getY(a)-pos.getY(b));
  stats.repacked++;stats.bytes+=attrs.reduce((n,[,a])=>n+a.array.byteLength,0);
  for(const [name,a]of attrs){const out=geometry.attributes[name];for(let i=0;i<count;i++)for(let k=0;k<a.itemSize;k++)out.array[i*a.itemSize+k]=a.array[indices[i]*a.itemSize+k];out.needsUpdate=true;}
 },dispose(){if(closed)return;closed=true;release();opaque.removeFromParent();mesh.geometry=source;mesh.material=base;mesh.renderOrder=originalRenderOrder;geometry.dispose();partial.dispose();opaqueMaterial.dispose();}};
 const release=registerScene(scene,owner);return owner;
}

// Standby geometry has its own ownership. Never modify or dispose the source.
export function smoothStandbyMaterial(source){
 const material=cloneRuntimeMaterial(source),compile=source.onBeforeCompile,key=source.customProgramCacheKey();
 material.side=THREE.FrontSide;material.transparent=true;material.depthWrite=false;material.forceSinglePass=true;
 material.onBeforeCompile=function(shader,renderer){
  compile.call(this,shader,renderer);const anchor='if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}';
  if(!shader.fragmentShader.includes(anchor))throw Error('Smooth standby coverage anchor missing');
  shader.fragmentShader=shader.fragmentShader.replace(anchor,'if(vNativeVisibility<.002)discard;').replace('#include <opaque_fragment>','diffuseColor.a*=clamp(vNativeVisibility,0.,1.);\n#include <opaque_fragment>');
 };
 material.customProgramCacheKey=()=>key+'|smooth-standby-v1';return material;
}

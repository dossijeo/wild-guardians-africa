import * as THREE from 'three';
const entries=new Set();let enabled=false;
export const orderedFarStats={packs:0,packMs:0,uploadBytes:0};
export function installOrderedFarTransition(mesh){
 const source=mesh.geometry,base=mesh.material,geometry=new THREE.InstancedBufferGeometry();
 if(source.index)geometry.setIndex(new THREE.BufferAttribute(source.index.array,source.index.itemSize,source.index.normalized));
 for(const [name,a]of Object.entries(source.attributes))geometry.setAttribute(name,a.isInstancedBufferAttribute?new THREE.InstancedBufferAttribute(new a.array.constructor(a.array.length),a.itemSize,a.normalized).setUsage(THREE.DynamicDrawUsage):new THREE.BufferAttribute(a.array,a.itemSize,a.normalized));
 geometry.instanceCount=source.instanceCount;geometry.setDrawRange(source.drawRange.start,source.drawRange.count);
 const material=pass=>{const m=base.clone();m.uniforms=base.uniforms;m.transparent=pass==='partial';m.depthWrite=pass==='opaque';m.side=THREE.FrontSide;m.forceSinglePass=true;
  m.onBeforeCompile=function(shader,renderer){base.onBeforeCompile.call(this,shader,renderer);const anchor='if(vMix*vDensityFade<.002)discard;';shader.fragmentShader=shader.fragmentShader.replace('if(coverageThreshold(gl_FragCoord.xy)<1.-vMix*vDensityFade)discard;',anchor);if(!shader.fragmentShader.includes(anchor))throw Error('Ordered far alpha hook missing');if(!shader.fragmentShader.includes('gl_FragColor.a=clamp(vMix*vDensityFade'))shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\n gl_FragColor.a=clamp(vMix*vDensityFade,0.,1.);');shader.fragmentShader=shader.fragmentShader.replace(anchor,anchor+(pass==='opaque'?'if(vMix*vDensityFade<.999)discard;':'if(vMix*vDensityFade>=.999)discard;'));};
  m.customProgramCacheKey=()=>base.customProgramCacheKey()+'|ordered-far-'+pass;return m;};
 const partial=material('partial'),opaqueMaterial=material('opaque'),opaque=new THREE.Mesh(geometry,opaqueMaterial);opaque.name='qa-opaque-far';opaque.frustumCulled=false;opaque.visible=false;mesh.add(opaque);
 const count=source.attributes.aTreeBase.count,indices=Array.from({length:count},(_,i)=>i),depth=new Float64Array(count);let signature='';
 const pack=(_renderer,_scene,camera)=>{if(!enabled)return;const start=performance.now(),attrs=Object.entries(source.attributes).filter(([,a])=>a.isInstancedBufferAttribute),view=camera.matrixWorldInverse.elements;
  const next=attrs.map(([,a])=>a.version).join(',')+'|'+view.join(',');if(next===signature)return;signature=next;
  const pos=source.attributes.aTreeBase,scale=source.attributes.aTreeScale,height=base.uniforms.uSize.value.y;
  for(let i=0;i<count;i++)depth[i]=view[2]*pos.getX(i)+view[6]*(pos.getY(i)+height*scale.getY(i)*.5)+view[10]*pos.getZ(i);
  indices.sort((a,b)=>depth[a]-depth[b]||pos.getX(a)-pos.getX(b)||pos.getZ(a)-pos.getZ(b)||pos.getY(a)-pos.getY(b));
  for(const [name,a]of attrs){const out=geometry.attributes[name];for(let i=0;i<count;i++)for(let k=0;k<a.itemSize;k++)out.array[i*a.itemSize+k]=a.array[indices[i]*a.itemSize+k];out.needsUpdate=true;orderedFarStats.uploadBytes+=out.array.byteLength;}
  geometry.instanceCount=source.instanceCount;orderedFarStats.packs++;orderedFarStats.packMs+=performance.now()-start;
 };
 const entry={mesh,source,geometry,base,partial,opaque,opaqueMaterial,pack};entries.add(entry);mesh.userData.qaSourceGeometry=source;apply(entry);
 source.addEventListener('dispose',()=>{entries.delete(entry);opaque.removeFromParent();geometry.dispose();partial.dispose();opaqueMaterial.dispose()});return mesh;
}
function apply(e){e.mesh.geometry=enabled?e.geometry:e.source;e.mesh.material=enabled?e.partial:e.base;e.opaque.visible=enabled;e.partial.needsUpdate=true;e.opaqueMaterial.needsUpdate=true;}
export function setOrderedFarTransition(value){enabled=!!value;for(const e of entries)apply(e);return {enabled,meshes:entries.size,...orderedFarStats};}

// Called before renderer traversal/uploads, not from mesh.onBeforeRender.
export function prepareOrderedFarTransitions(renderer,scene,camera){if(enabled)for(const e of entries)e.pack(renderer,scene,camera);}

import * as THREE from 'three';
import {MaterialBakeQueue} from './material-bake-queue.js';
import {bakeFragment,liveBranch} from './mangrove-material-cache-shader.js';
import {observeMangroveChunks} from './mangrove-chunk-events.js';

// Lifecycle integration of the selected fixed512 shader. No camera-dependent LOD.
export function createMangroveMaterialCache(w){
 const r=w.renderer,states=new Map(),dirty=new Set(),queue=new MaterialBakeQueue({budgetBytes:40*1024*1024});
 let bytes=0;for(let side=514;side>=1;side=Math.floor(side/2))bytes+=side*side*4;
 const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(2,2);
 const uniforms={resolution:{value:512}};
 const bake=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:bakeFragment,depthTest:false,depthWrite:false,toneMapped:false});
 const quad=new THREE.Mesh(geometry,bake);quad.frustumCulled=false;scene.add(quad);
 const stats={scope:'Fixed512 material cache lifecycle',queue:queue.stats,added:0,removed:0,invalidations:0};
 let closed=false;
 const patch=(s,m)=>{
  if(!s.texture.value||s.hooks.has(m))return;
  w.toon.material(m);const prior=m.onBeforeCompile,key=m.customProgramCacheKey;
  s.hooks.set(m,{prior,key});
  m.onBeforeCompile=function(shader,renderer){prior.call(this,shader,renderer);const a=shader.fragmentShader.indexOf('if(uGroundPureMoss>.5){'),b=shader.fragmentShader.indexOf('if((uBiome>4.5',a);if(a<0||b<a)throw Error('Fixed512 shader anchor changed');shader.fragmentShader='uniform sampler2D uQaGroundCache;uniform float uQaCacheResolution;\n'+shader.fragmentShader.slice(0,a)+liveBranch+shader.fragmentShader.slice(b);shader.uniforms.uQaGroundCache=s.texture;shader.uniforms.uQaCacheResolution={value:512};};
  m.customProgramCacheKey=()=>key.call(m)+'|qa-fixed512-lifecycle-v1';m.needsUpdate=true;
 };
 const owner=observeMangroveChunks(w,{add(record){const s={record,revision:0,texture:{value:null},hooks:new Map(),rect:record.ground.material.userData.biomeGround.uGroundRect.value.clone()};s.mask=record.ground.material.userData.biomeGround.uGroundMask.value;s.changed=()=>{s.revision++;dirty.add(record.key);stats.invalidations++;};s.mask.addEventListener('groundmaskchanged',s.changed);states.set(record.key,s);dirty.add(record.key);stats.added++;},remove(record){const s=states.get(record.key);if(!s)return;s.mask.removeEventListener('groundmaskchanged',s.changed);for(const [m,h]of s.hooks){m.onBeforeCompile=h.prior;m.customProgramCacheKey=h.key;m.needsUpdate=true;}dirty.delete(record.key);queue.remove(record.key);states.delete(record.key);stats.removed++;},material(record,m){const s=states.get(record.key);if(s)patch(s,m);}});
 const update=()=>{
  if(closed)return;
  // Admit one target at a time; keep published targets until replacement completes.
  if(!queue.pending.size&&dirty.size){const key=dirty.values().next().value,s=states.get(key);if(!s){dirty.delete(key);return;}
   const result=queue.request(key,{version:s.revision,bytes,tiles:1,create:()=>new THREE.WebGLRenderTarget(514,514,{depthBuffer:false,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:true}),draw(target){
    const source=s.record.ground.material.userData.biomeGround;for(const [name,u]of Object.entries(source))uniforms[name]=u;
    uniforms.uGroundRect={value:s.rect};bake.uniformsNeedUpdate=true;
    const previous=r.getRenderTarget(),auto=r.autoClear;try{r.autoClear=true;r.setRenderTarget(target);r.render(scene,camera);}finally{r.setRenderTarget(previous);r.autoClear=auto;}
   },publish(target){s.texture.value=target.texture;for(const m of s.record.materials)patch(s,m);},destroy:target=>target.dispose()});
   if(result==='queued'||result==='unchanged')dirty.delete(key);
  }
  queue.step();
 };
 const controller={states,owner,queue,stats,update,invalidate(key){const s=states.get(key);if(!s)return false;s.revision++;dirty.add(key);stats.invalidations++;return true;},dispose(){if(closed)return;closed=true;owner.dispose();queue.dispose();dirty.clear();geometry.dispose();bake.dispose();}};
 return controller;
}

export function mangroveMaterialCacheEnabled(search=globalThis.location?.search??''){const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('groundCache')==='fixed512';}

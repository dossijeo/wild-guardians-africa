import * as THREE from 'three';
import {MaterialBakeQueue} from '/src/rendering/material-bake-queue.js';
import {bakeFragment,liveBranch} from './qa-mangrove-hybrid-cache-20261023.js';
import {MangroveCacheProjection,cacheBytes} from './qa-mangrove-cache-projection-20261023.js';
import {observeMangroveChunks} from './qa-mangrove-chunk-events-20261023.js';

// QA-only end-to-end owner. Original materials remain the fallback until ready.
export async function installIncrementalCache(w){
 const r=w.renderer,queue=new MaterialBakeQueue({budgetBytes:32*1024*1024}),planner=new MangroveCacheProjection(w),states=new Map();
 const fallback=new THREE.DataTexture(new Uint8Array([0,0,255,255]),1,1);fallback.needsUpdate=true;
 const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(2,2);
 const first=[...w.chunks.values()].map(g=>g.children.find(o=>o.userData.ground)?.material.userData.biomeGround).find(Boolean);
 if(!first)throw Error('Missing ground');
 const uniforms={...first,uGroundRect:{value:first.uGroundRect.value.clone()},uQaBakeRect:{value:new THREE.Vector3()},resolution:{value:512}};
 const fragment=bakeFragment.replace('uniform float resolution;','uniform vec3 uQaBakeRect;uniform float resolution;').replace('vec2 p=uGroundRect.xy+local*48.;','vec2 p=uQaBakeRect.xy+local*uQaBakeRect.z;');
 const bake=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false});
 const quad=new THREE.Mesh(geometry,bake);quad.frustumCulled=false;scene.add(quad);
 const stats={scope:'QA incremental cache, no smooth temporal transition yet',queue:queue.stats,added:0,removed:0,plans:0,submissions:[],publications:0};
 let dirty=true,closed=false,frame=0,lastCamera='',owner;
 const refresh=s=>{
  if(!s.coarse||s.wantFine&&!s.fine)return;
  for(const material of s.record.materials){
   if(s.patched.has(material))continue;
   w.toon.material(material);const prior=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
   material.onBeforeCompile=function(shader,renderer){prior.call(this,shader,renderer);const a=shader.fragmentShader.indexOf('if(uGroundPureMoss>.5){'),b=shader.fragmentShader.indexOf('if((uBiome>4.5',a);if(a<0||b<a)throw Error('Incremental ground anchors changed');
    let branch=liveBranch.replace('if(uGroundPureMoss>.5){','if(uGroundPureMoss>.5 && uQaCacheReady>.5){');
    branch=branch.replace('vec4 cached=texture(uQaGroundCache,cacheUV);',`vec4 cached=texture(uQaGroundCache,cacheUV);
     if(uQaFineOn>.5){vec2 q=(worldP.xz-uGroundRect.xy-uQaFineRect.xy)/uQaFineRect.z;vec2 e=min(q,1.-q);float blend=smoothstep(0.,1.5/uQaFineRect.z,min(e.x,e.y));cached=mix(cached,texture(uQaFineCache,(q*uQaFineRect.w+1.)/(uQaFineRect.w+2.)),blend);}`);
    shader.fragmentShader='uniform sampler2D uQaGroundCache,uQaFineCache;uniform float uQaCacheResolution,uQaCacheReady,uQaFineOn;uniform vec4 uQaFineRect;\n'+shader.fragmentShader.slice(0,a)+branch+shader.fragmentShader.slice(a);
    Object.assign(shader.uniforms,s.uniforms);
   };
   material.customProgramCacheKey=()=>key()+'|incremental-mangrove-v1';material.needsUpdate=true;s.patched.add(material);s.hooks.set(material,{prior,key});
  }
  s.uniforms.uQaCacheReady.value=1;
 };
 const releaseTargets=s=>{s.uniforms.uQaCacheReady.value=0;s.uniforms.uQaFineOn.value=0;s.uniforms.uQaGroundCache.value=fallback;s.uniforms.uQaFineCache.value=fallback;queue.remove(s.record.key+':coarse');queue.remove(s.record.key+':fine');s.coarse=null;s.fine=null;};
 owner=observeMangroveChunks(w,{add(record){stats.added++;planner.register(record.key,record.group);states.set(record.key,{record,coarse:null,fine:null,wantFine:false,patched:new WeakSet(),hooks:new Map(),uniforms:{uQaGroundCache:{value:fallback},uQaCacheResolution:{value:512},uQaCacheReady:{value:0},uQaFineCache:{value:fallback},uQaFineOn:{value:0},uQaFineRect:{value:new THREE.Vector4()}}});dirty=true;},remove(record){const s=states.get(record.key);if(s){for(const [m,h]of s.hooks){m.onBeforeCompile=h.prior;m.customProgramCacheKey=h.key;m.needsUpdate=true;}s.hooks.clear();releaseTargets(s);states.delete(record.key);}planner.release(record.key);stats.removed++;dirty=true;},material(record){const s=states.get(record.key);if(s)refresh(s);}});
 function request(s,kind,size,x,z,side){
  const key=s.record.key+':'+kind,version=[size,x,z,side].join('/'),u=s.record.ground.material.userData.biomeGround,pixels=size+2,grid=size>=1024?4:2;
  queue.request(key,{version,bytes:cacheBytes(size),tiles:grid*grid,
   create(){return new THREE.WebGLRenderTarget(pixels,pixels,{depthBuffer:false,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});},
   draw(target,tile,total){
    uniforms.uGroundRect.value.copy(u.uGroundRect.value);uniforms.uGroundMask.value=u.uGroundMask.value;uniforms.uWetBank.value=u.uWetBank.value;uniforms.resolution.value=size;uniforms.uQaBakeRect.value.set(x,z,side);bake.uniformsNeedUpdate=true;
    const col=tile%grid,row=Math.floor(tile/grid),x0=Math.floor(col*pixels/grid),y0=Math.floor(row*pixels/grid);
    target.scissorTest=true;target.scissor.set(x0,y0,Math.floor((col+1)*pixels/grid)-x0,Math.floor((row+1)*pixels/grid)-y0);target.texture.generateMipmaps=tile===total-1;
    const saved=r.getRenderTarget(),auto=r.autoClear,t=performance.now();try{r.autoClear=false;r.setRenderTarget(target);r.render(scene,camera);}finally{r.setRenderTarget(saved);r.autoClear=auto;}stats.submissions.push(performance.now()-t);
   },publish(target){target.scissorTest=false;s[kind]=target;stats.publications++;
    if(kind==='coarse'){s.uniforms.uQaGroundCache.value=target.texture;s.uniforms.uQaCacheResolution.value=size;}
    else{s.uniforms.uQaFineCache.value=target.texture;s.uniforms.uQaFineRect.value.set(x-u.uGroundRect.value.x,z-u.uGroundRect.value.y,side,size);s.uniforms.uQaFineOn.value=1;}
    refresh(s);
   },destroy:target=>target.dispose()});
 }
 function plan(){
  w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);const selection=planner.plan(),visible=new Set(selection.rows.map(row=>row.key));stats.plans++;
  for(const [key,s]of states)if(!visible.has(key))releaseTargets(s);
  for(const row of selection.rows.sort((a,b)=>b.ppm-a.ppm)){
   const s=states.get(row.key);if(!s)continue;const u=s.record.ground.material.userData.biomeGround,rect=u.uGroundRect.value;
   s.wantFine=row.flavor==='noise';request(s,'coarse',s.wantFine?512:row.resolution,rect.x,rect.y,48);
   if(s.wantFine){const box=planner.entries.find(e=>e.key===row.key).box,ray=new THREE.Vector3(0,-.55,.5).unproject(w.camera).sub(w.camera.position).normalize();const point=ray.multiplyScalar(((box.min.y+box.max.y)/2-w.camera.position.y)/ray.y).add(w.camera.position);
    const x=THREE.MathUtils.clamp(Math.round((point.x-12)/4)*4,box.min.x,box.max.x-24),z=THREE.MathUtils.clamp(Math.round((point.z-12)/4)*4,box.min.z,box.max.z-24);request(s,'fine',1024,x,z,24);
   }else{queue.remove(row.key+':fine');s.fine=null;s.uniforms.uQaFineOn.value=0;s.uniforms.uQaFineCache.value=fallback;refresh(s);}
  }
 }
 const warm=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false}),previous=r.getRenderTarget();
 try{uniforms.uQaBakeRect.value.set(first.uGroundRect.value.x,first.uGroundRect.value.y,48);r.setRenderTarget(warm);const compiled=r.compileAsync(scene,camera);r.setRenderTarget(previous);await compiled;r.setRenderTarget(warm);r.render(scene,camera);}finally{r.setRenderTarget(previous);warm.dispose();}
 const original=w.render;
 const controller={stats,queue,states,owner,update(){if(closed)return;const signature=w.camera.position.toArray().concat(w.controls.target.toArray(),w.camera.projectionMatrix.elements,r.domElement.width,r.domElement.height).join(',');if(dirty||frame++%8===0&&signature!==lastCamera){plan();lastCamera=signature;dirty=false;}queue.step();},dispose(){if(closed)return;closed=true;owner.dispose();queue.dispose();bake.dispose();geometry.dispose();fallback.dispose();if(w.render===wrapped)w.render=original;}};
 function wrapped(...args){controller.update();return original.apply(this,args);}
 w.render=wrapped;w.qaIncrementalGround=controller;controller.update();
 return stats;
}

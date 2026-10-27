import * as THREE from 'three';
import {MaterialBakeQueue} from '/src/rendering/material-bake-queue.js';
import {bakeFragment,liveBranch} from './qa-mangrove-hybrid-cache-20261023.js';
import {MangroveCacheProjection,cacheBytes} from './qa-mangrove-cache-projection-20261023.js';
import {observeMangroveChunks} from './qa-mangrove-chunk-events-20261023.js';

// QA-only end-to-end owner. Original materials remain the fallback until ready.
export async function installIncrementalCache(w,{smooth=false,entryOverride=null}={}){
 const r=w.renderer,queue=new MaterialBakeQueue({budgetBytes:32*1024*1024}),planner=new MangroveCacheProjection(w),states=new Map();
 const fallback=new THREE.DataTexture(new Uint8Array([0,0,255,255]),1,1);fallback.needsUpdate=true;
 const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(2,2);
 const first=[...w.chunks.values()].map(g=>g.children.find(o=>o.userData.ground)?.material.userData.biomeGround).find(Boolean);
 if(!first)throw Error('Missing ground');
 const uniforms={...first,uGroundRect:{value:first.uGroundRect.value.clone()},uQaBakeRect:{value:new THREE.Vector3()},resolution:{value:512}};
 const fragment=bakeFragment.replace('uniform float resolution;','uniform vec3 uQaBakeRect;uniform float resolution;').replace('vec2 p=uGroundRect.xy+local*48.;','vec2 p=uQaBakeRect.xy+local*uQaBakeRect.z;');
 const bake=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false});
 const quad=new THREE.Mesh(geometry,bake);quad.frustumCulled=false;scene.add(quad);
 const stats={scope:'QA incremental cache; optional full material entry and cache crossfades',smooth,queue:queue.stats,added:0,removed:0,plans:0,submissions:[],publications:0};
 let lastUpdate=performance.now(),dirty=true,closed=false,frame=0,lastCamera='',owner;
 const refresh=s=>{
  if(!s.coarse||s.wantFine&&!s.fine)return;
  for(const material of s.record.materials){
   if(s.patched.has(material))continue;
   w.toon.material(material);const prior=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
   material.onBeforeCompile=function(shader,renderer){prior.call(this,shader,renderer);const a=shader.fragmentShader.indexOf('if(uGroundPureMoss>.5){'),b=shader.fragmentShader.indexOf('if((uBiome>4.5',a);if(a<0||b<a)throw Error('Incremental ground anchors changed');
    let branch=liveBranch.replace('if(uGroundPureMoss>.5){','if(uGroundPureMoss>.5 && uQaCacheReady>.5){');
    branch=branch.replace('vec4 cached=texture(uQaGroundCache,cacheUV);',`vec4 cached=texture(uQaGroundCache,cacheUV);
     if(uQaFineOn>.5){vec2 q=(worldP.xz-uGroundRect.xy-uQaFineRect.xy)/uQaFineRect.z;vec2 e=min(q,1.-q);float blend=smoothstep(0.,1.5/uQaFineRect.z,min(e.x,e.y));cached=mix(cached,texture(uQaFineCache,(q*uQaFineRect.w+1.)/(uQaFineRect.w+2.)),blend);}`);
    if(smooth)branch=branch.replace('vec4 cached=texture(uQaGroundCache,cacheUV);',`vec4 cached=texture(uQaGroundCache,cacheUV);if(uQaCoarseFade<1.)cached=mix(texture(uQaOldCoarse,((worldP.xz-uGroundRect.xy)/48.*uQaOldResolution+1.)/(uQaOldResolution+2.)),cached,uQaCoarseFade);`).replace('if(uQaFineOn>.5){vec2 q=', 'vec4 coarseCached=cached;if(uQaFineOn>.5){vec2 q=').replace('cached=mix(cached,texture(uQaFineCache,(q*uQaFineRect.w+1.)/(uQaFineRect.w+2.)),blend);}',`cached=mix(cached,texture(uQaFineCache,(q*uQaFineRect.w+1.)/(uQaFineRect.w+2.)),blend);}if(uQaFineFade<1.){vec2 q=(worldP.xz-uGroundRect.xy-uQaOldFineRect.xy)/uQaOldFineRect.z;vec2 e=min(q,1.-q);float b=smoothstep(0.,1.5/uQaOldFineRect.z,min(e.x,e.y));vec4 old=mix(coarseCached,texture(uQaOldFine,(q*uQaOldFineRect.w+1.)/(uQaOldFineRect.w+2.)),b);cached=mix(old,cached,uQaFineFade);}`);
    if(smooth)branch=branch.replace('if(uQaFineOn>.5)', 'if(uQaFineOn>0.)');
    if(smooth)branch=branch.replace('vec3 tex=textureGrad', 'cached=mix(coarseCached,cached,uQaFineOn);\n vec3 tex=textureGrad');
    const originalMoss=shader.fragmentShader.slice(a,b);
    if(smooth)branch=branch.replace('materialCover410=cached.g;return;',`materialCover410=cached.g;
     if(uQaEntryBlend<1.){
      vec3 cc=color,cn=N,sa=qaSoilAlbedo,sn=qaSoilNormal;float cr=rough,cw=wet,ao=materialAO410,cover=materialCover410,sr=qaSoilRough,sw=qaSoilWeight;
      qaOriginalMoss(worldP,Ng,color,N,rough,wet);
      color=mix(color,cc,uQaEntryBlend);N=normalize(mix(N,cn,uQaEntryBlend));rough=mix(rough,cr,uQaEntryBlend);wet=mix(wet,cw,uQaEntryBlend);
      materialAO410=mix(materialAO410,ao,uQaEntryBlend);materialCover410=mix(materialCover410,cover,uQaEntryBlend);
      qaSoilAlbedo=mix(qaSoilAlbedo,sa,uQaEntryBlend);qaSoilNormal=normalize(mix(qaSoilNormal,sn,uQaEntryBlend));qaSoilRough=mix(qaSoilRough,sr,uQaEntryBlend);qaSoilWeight=mix(qaSoilWeight,sw,uQaEntryBlend);
     }return;`);
    shader.fragmentShader=(smooth?'uniform sampler2D uQaOldCoarse,uQaOldFine;uniform float uQaCoarseFade,uQaFineFade,uQaOldResolution,uQaEntryBlend;uniform vec4 uQaOldFineRect;\n':'')+'uniform sampler2D uQaGroundCache,uQaFineCache;uniform float uQaCacheResolution,uQaCacheReady,uQaFineOn;uniform vec4 uQaFineRect;\n'+shader.fragmentShader.slice(0,a)+branch+shader.fragmentShader.slice(a);
    if(smooth)shader.fragmentShader=shader.fragmentShader.replace(originalMoss,'if(uGroundPureMoss>.5){qaOriginalMoss(worldP,Ng,color,N,rough,wet);return;}\n').replace('void groundMaterial417(',`void qaOriginalMoss(vec3 worldP,vec3 Ng,inout vec3 color,inout vec3 N,inout float rough,inout float wet){${originalMoss}}\nvoid groundMaterial417(`);
    Object.assign(shader.uniforms,s.uniforms);
   };
   material.customProgramCacheKey=()=>key()+'|incremental-mangrove-v1'+(smooth?'|crossfade-entry-v3':'');material.needsUpdate=true;s.patched.add(material);s.hooks.set(material,{prior,key});
  }
  if(smooth&&s.uniforms.uQaCacheReady.value===0){s.entryStart=performance.now();s.uniforms.uQaEntryBlend.value=0;}
  s.uniforms.uQaCacheReady.value=1;
 };
 const releaseTargets=s=>{s.entryStart=null;s.uniforms.uQaEntryBlend.value=0;s.transitions={};s.uniforms.uQaCoarseFade.value=1;s.uniforms.uQaFineFade.value=1;s.uniforms.uQaOldCoarse.value=fallback;s.uniforms.uQaOldFine.value=fallback;s.uniforms.uQaCacheReady.value=0;s.uniforms.uQaFineOn.value=0;s.uniforms.uQaGroundCache.value=fallback;s.uniforms.uQaFineCache.value=fallback;queue.remove(s.record.key+':coarse');queue.remove(s.record.key+':fine');s.coarse=null;s.fine=null;};
 owner=observeMangroveChunks(w,{add(record){stats.added++;planner.register(record.key,record.group);states.set(record.key,{record,coarse:null,fine:null,wantFine:false,patched:new WeakSet(),hooks:new Map(),uniforms:{uQaGroundCache:{value:fallback},uQaCacheResolution:{value:512},uQaCacheReady:{value:0},uQaFineCache:{value:fallback},uQaFineOn:{value:0},uQaFineRect:{value:new THREE.Vector4()},uQaOldCoarse:{value:fallback},uQaOldFine:{value:fallback},uQaOldResolution:{value:512},uQaOldFineRect:{value:new THREE.Vector4()},uQaEntryBlend:{value:smooth?0:1},uQaCoarseFade:{value:1},uQaFineFade:{value:1}}});dirty=true;},remove(record){const s=states.get(record.key);if(s){for(const [m,h]of s.hooks){m.onBeforeCompile=h.prior;m.customProgramCacheKey=h.key;m.needsUpdate=true;}s.hooks.clear();releaseTargets(s);states.delete(record.key);}planner.release(record.key);stats.removed++;dirty=true;},material(record){const s=states.get(record.key);if(s)refresh(s);}});
 function request(s,kind,size,x,z,side){
  const key=s.record.key+':'+kind,version=[size,x,z,side].join('/'),u=s.record.ground.material.userData.biomeGround,pixels=size+2,grid=size>=1024?4:2;
  queue.request(key,{version,retainPrevious:smooth,bytes:cacheBytes(size),tiles:grid*grid,
   create(){return new THREE.WebGLRenderTarget(pixels,pixels,{depthBuffer:false,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});},
   draw(target,tile,total){
    uniforms.uGroundRect.value.copy(u.uGroundRect.value);uniforms.uGroundMask.value=u.uGroundMask.value;uniforms.uWetBank.value=u.uWetBank.value;uniforms.resolution.value=size;uniforms.uQaBakeRect.value.set(x,z,side);bake.uniformsNeedUpdate=true;
    const col=tile%grid,row=Math.floor(tile/grid),x0=Math.floor(col*pixels/grid),y0=Math.floor(row*pixels/grid);
    target.scissorTest=true;target.scissor.set(x0,y0,Math.floor((col+1)*pixels/grid)-x0,Math.floor((row+1)*pixels/grid)-y0);target.texture.generateMipmaps=tile===total-1;
    const saved=r.getRenderTarget(),auto=r.autoClear,t=performance.now();try{r.autoClear=false;r.setRenderTarget(target);r.render(scene,camera);}finally{r.setRenderTarget(saved);r.autoClear=auto;}stats.submissions.push(performance.now()-t);
   },publish(target,previous){
    if(smooth&&previous){s.transitions??={};s.transitions[kind]=performance.now();
     if(kind==='coarse'){s.uniforms.uQaOldCoarse.value=previous.texture;s.uniforms.uQaOldResolution.value=s.uniforms.uQaCacheResolution.value;s.uniforms.uQaCoarseFade.value=0;}
     else{s.uniforms.uQaOldFine.value=previous.texture;s.uniforms.uQaOldFineRect.value.copy(s.uniforms.uQaFineRect.value);s.uniforms.uQaFineFade.value=0;}
    }
    target.scissorTest=false;s[kind]=target;stats.publications++;
    if(kind==='coarse'){s.uniforms.uQaGroundCache.value=target.texture;s.uniforms.uQaCacheResolution.value=size;}
    else{s.uniforms.uQaFineCache.value=target.texture;s.uniforms.uQaFineRect.value.set(x-u.uGroundRect.value.x,z-u.uGroundRect.value.y,side,size);s.uniforms.uQaFineOn.value=smooth?s.uniforms.uQaFineOn.value:1;}
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
   }else{if(smooth){queue.cancel(row.key+':fine');}else{if(s.transitions)delete s.transitions.fine;s.uniforms.uQaFineFade.value=1;s.uniforms.uQaOldFine.value=fallback;queue.remove(row.key+':fine');s.fine=null;s.uniforms.uQaFineOn.value=0;s.uniforms.uQaFineCache.value=fallback;}refresh(s);}
  }
 }
 const warm=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false}),previous=r.getRenderTarget();
 try{uniforms.uQaBakeRect.value.set(first.uGroundRect.value.x,first.uGroundRect.value.y,48);r.setRenderTarget(warm);const compiled=r.compileAsync(scene,camera);r.setRenderTarget(previous);await compiled;r.setRenderTarget(warm);r.render(scene,camera);}finally{r.setRenderTarget(previous);warm.dispose();}
 const original=w.render;
 const controller={stats,queue,states,owner,update(){if(closed)return;
  const now=performance.now(),delta=Math.min(100,now-lastUpdate);lastUpdate=now;
  if(smooth)for(const s of states.values()){
   const u=s.uniforms,target=s.wantFine&&s.fine?1:0;
   if(s.entryStart!=null){const t=Math.min(1,(now-s.entryStart)/180);u.uQaEntryBlend.value=t*t*(3-2*t);if(t===1)s.entryStart=null;}
   u.uQaFineOn.value=target?Math.min(1,u.uQaFineOn.value+delta/180):Math.max(0,u.uQaFineOn.value-delta/180);
   if(!s.wantFine&&s.fine&&u.uQaFineOn.value===0){u.uQaFineCache.value=fallback;u.uQaOldFine.value=fallback;u.uQaFineFade.value=1;if(s.transitions)delete s.transitions.fine;queue.remove(s.record.key+':fine');s.fine=null;}
  }
  if(smooth)for(const s of states.values())for(const [kind,start]of Object.entries(s.transitions??{})){
   const t=Math.min(1,(performance.now()-start)/180),u=s.uniforms;u[kind==='coarse'?'uQaCoarseFade':'uQaFineFade'].value=t*t*(3-2*t);
   if(t===1){u[kind==='coarse'?'uQaOldCoarse':'uQaOldFine'].value=fallback;queue.releasePrevious(s.record.key+':'+kind);delete s.transitions[kind];dirty=true;}
  }
  const signature=w.camera.position.toArray().concat(w.controls.target.toArray(),w.camera.projectionMatrix.elements,r.domElement.width,r.domElement.height).join(',');if(dirty||frame++%8===0&&signature!==lastCamera){plan();lastCamera=signature;dirty=false;}queue.step();if(entryOverride!==null)for(const s of states.values())s.uniforms.uQaEntryBlend.value=entryOverride;},dispose(){if(closed)return;closed=true;owner.dispose();queue.dispose();bake.dispose();geometry.dispose();fallback.dispose();if(w.render===wrapped)w.render=original;}};
 function wrapped(...args){controller.update();return original.apply(this,args);}
 w.render=wrapped;w.qaIncrementalGround=controller;controller.update();
 return stats;
}

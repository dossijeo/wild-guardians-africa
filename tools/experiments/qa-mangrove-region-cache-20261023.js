import * as THREE from 'three';
import {MaterialBakeQueue} from '/src/rendering/material-bake-queue.js';
import {GpuTimer} from '/tests/browser/gpu-timer.js';
import {bakeFragment,installHybridCache} from './qa-mangrove-hybrid-cache-20261023.js';
import {MangroveCacheProjection,cacheBytes} from './qa-mangrove-cache-projection-20261023.js';

// QA only: frozen spatial selection. Detail region = 24m at1024, equivalent
// texel density to a48m chunk at2048, surrounded by a512 chunk cache.
export async function installRegionCache(w,{verifyTiles=false}={}){
 w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);
 const planner=new MangroveCacheProjection(w),selection=planner.plan(),plan=new Map(),fine=[];
 for(const row of selection.rows){
  const mesh=w.chunks.get(row.key)?.children.find(o=>o.userData.ground);if(!mesh)continue;
  plan.set(mesh.material,{...row,flavor:'weights',resolution:row.flavor==='noise'?512:row.resolution});
  if(row.flavor==='noise')fine.push({row,mesh,box:planner.entries.find(e=>e.key===row.key).box});
 }
 const coarse=await installHybridCache(w,128,'weights',plan),r=w.renderer;
 const stats={scope:'QA frozen coarse cache and detailed region; tiled generation, no streaming invalidation yet',coarse,regions:[],bytes:coarse.bytes,tileSubmissionsMs:[]};
 const queue=new MaterialBakeQueue({budgetBytes:32*1024*1024,reservedBytes:coarse.bytes});stats.queue=queue.stats;
 const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(2,2),first=fine[0]?.mesh.material.userData.biomeGround;
 if(!first)return stats;
 const uniforms={...first,uGroundRect:{value:first.uGroundRect.value.clone()},uGroundMask:{value:first.uGroundMask.value},uWetBank:{value:first.uWetBank.value},uQaBakeRect:{value:new THREE.Vector3(first.uGroundRect.value.x,first.uGroundRect.value.y,24)},resolution:{value:1024}};
 const fragment=bakeFragment.replace('uniform float resolution;','uniform vec3 uQaBakeRect;uniform float resolution;').replace('vec2 p=uGroundRect.xy+local*48.;','vec2 p=uQaBakeRect.xy+local*uQaBakeRect.z;');
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false});
 const quad=new THREE.Mesh(geometry,material);quad.frustumCulled=false;scene.add(quad);
 const timer=new GpuTimer(r.getContext(),64),compileStart=performance.now();
 try{
  // Compile against the same target color space as the bake, then warm its
  // first draw during preparation. Main-frame and offscreen programs can differ.
  const warmTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false}),savedTarget=r.getRenderTarget();
  try{
   let compiled;try{r.setRenderTarget(warmTarget);compiled=r.compileAsync(scene,camera);}finally{r.setRenderTarget(savedTarget);}await compiled;
   stats.compileWallMs=performance.now()-compileStart;const t=performance.now();timer.begin(-1);
   try{r.setRenderTarget(warmTarget);r.render(scene,camera);}finally{r.setRenderTarget(savedTarget);timer.end();}stats.warmDrawCpuMs=performance.now()-t;
  }finally{warmTarget.dispose();}
  for(const {row,mesh,box}of fine){
   const u=mesh.material.userData.biomeGround,side=24,size=1024,pixels=size+2;
   const ray=new THREE.Vector3(0,-.55,.5).unproject(w.camera).sub(w.camera.position).normalize(),y=(box.min.y+box.max.y)/2;
   const point=ray.clone().multiplyScalar((y-w.camera.position.y)/ray.y).add(w.camera.position);
   const x=THREE.MathUtils.clamp(point.x-side/2,box.min.x,box.max.x-side),z=THREE.MathUtils.clamp(point.z-side/2,box.min.z,box.max.z-side);
   uniforms.uGroundRect.value.copy(u.uGroundRect.value);uniforms.uGroundMask.value=u.uGroundMask.value;uniforms.uWetBank.value=u.uWetBank.value;uniforms.uQaBakeRect.value.set(x,z,side);material.uniformsNeedUpdate=true;
   let target=null;
   const release=()=>queue.remove(row.key);mesh.material.addEventListener('dispose',release);
   const admitted=queue.request(row.key,{version:1,bytes:cacheBytes(size),tiles:16,
    create(){const value=new THREE.WebGLRenderTarget(pixels,pixels,{depthBuffer:false,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});value.scissorTest=true;return value;},
    draw(value,tile){
     const col=tile%4,rowIndex=Math.floor(tile/4),x0=Math.floor(col*pixels/4),y0=Math.floor(rowIndex*pixels/4),x1=Math.floor((col+1)*pixels/4),y1=Math.floor((rowIndex+1)*pixels/4);
     value.scissor.set(x0,y0,x1-x0,y1-y0);value.texture.generateMipmaps=tile===15;
     const previous=r.getRenderTarget(),auto=r.autoClear,t=performance.now();timer.begin(stats.tileSubmissionsMs.length);
     try{r.autoClear=false;r.setRenderTarget(value);r.render(scene,camera);}finally{r.setRenderTarget(previous);r.autoClear=auto;timer.end();}
     stats.tileSubmissionsMs.push(performance.now()-t);
    },publish(value){target=value;},destroy(value){value.dispose();}
   });
   if(admitted==='budget'){stats.budgetFallbacks=(stats.budgetFallbacks??0)+1;continue;}
   while(queue.pending.has(row.key)){await new Promise(requestAnimationFrame);queue.step();}
   if(!target)continue; // Chunk disposed during preparation: never publish stale data.
   target.scissorTest=false;
   if(verifyTiles){
    // Readback is QA-only and excluded from timing runs. Keep the full viewport
    // while scissoring: derivatives and texture footprints must match one draw.
    const reference=new THREE.WebGLRenderTarget(pixels,pixels,{depthBuffer:false,generateMipmaps:false});
    const priorTarget=r.getRenderTarget(),a=new Uint8Array(pixels*pixels*4),b=new Uint8Array(a.length);
    try{
     r.setRenderTarget(reference);r.render(scene,camera);r.setRenderTarget(priorTarget);
     r.readRenderTargetPixels(target,0,0,pixels,pixels,a);r.readRenderTargetPixels(reference,0,0,pixels,pixels,b);
     let max=0,different=0,total=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);total+=d;if(d)different++;}
     stats.tileVerification??=[];stats.tileVerification.push({key:row.key,maxChannelDifference:max,differentChannels:different,meanChannelDifference:total/a.length,comparedChannels:a.length,temporaryBytes:pixels*pixels*4});
     if(max!==0)throw Error('Tiled bake differs from single-pass reference: '+max);
    }finally{r.setRenderTarget(priorTarget);reference.dispose();}
   }
   const prior=mesh.material.onBeforeCompile,key=mesh.material.customProgramCacheKey.bind(mesh.material);
   const fineRect=new THREE.Vector4(x-u.uGroundRect.value.x,z-u.uGroundRect.value.y,side,size);
   mesh.material.onBeforeCompile=function(shader,renderer){
    prior.call(this,shader,renderer);const anchor='vec4 cached=texture(uQaGroundCache,cacheUV);';if(!shader.fragmentShader.includes(anchor))throw Error('Region cache anchor changed');
    shader.uniforms.uQaFineCache={value:target.texture};shader.uniforms.uQaFineRect={value:fineRect};
    shader.fragmentShader='uniform sampler2D uQaFineCache;uniform vec4 uQaFineRect;\n'+shader.fragmentShader.replace(anchor,anchor+`
     vec2 fineLocal=(worldP.xz-uGroundRect.xy-uQaFineRect.xy)/uQaFineRect.z;
     vec2 fineUV=(fineLocal*uQaFineRect.w+1.)/(uQaFineRect.w+2.);
     vec2 fineEdge=min(fineLocal,1.-fineLocal);
     float fineBlend=smoothstep(0.,1.5/uQaFineRect.z,min(fineEdge.x,fineEdge.y));
     cached=mix(cached,texture(uQaFineCache,fineUV),fineBlend);
    `);
   };
   mesh.material.customProgramCacheKey=()=>key()+'|qa-fine-region-v1';mesh.material.needsUpdate=true;
   stats.bytes+=cacheBytes(size);stats.regions.push({key:row.key,x,z,side,resolution:size,tiles:16});
  }
  const deadline=performance.now()+10000;while(timer.pending.length&&performance.now()<deadline){await new Promise(requestAnimationFrame);timer.poll();}stats.generationGpu=timer.report();
 }catch(error){queue.dispose();throw error;}finally{timer.dispose();material.dispose();geometry.dispose();}
 return stats;
}

import * as THREE from 'three';
import {GpuTimer} from '/tests/browser/gpu-timer.js';

import {bakeFragment,liveBranch} from '/src/rendering/mangrove-material-cache-shader.js';
export {bakeFragment,liveBranch};

export async function installHybridCache(w,requestedResolution=256,requestedFlavor='weights',plan=null,anisotropy=1){
 if(![128,256,512,1024].includes(requestedResolution))throw Error('Invalid cache resolution');
 if(!['weights','noise'].includes(requestedFlavor))throw Error('Invalid cache flavor');
 const r=w.renderer,materials=new Set();w.scene.traverse(o=>{if(o.userData.ground)materials.add(o.material)});
 const stats={anisotropy,resolution:requestedResolution,flavor:requestedFlavor,registeredMaterials:materials.size,materials:0,chunks:[],bytes:0,submissionsMs:[],scope:'QA fixed resident chunks; no streaming integration yet'};
 const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.PlaneGeometry(2,2);
 const first=materials.values().next().value?.userData.biomeGround;if(!first)throw Error('No ground for cache');
 const uniforms={...first,uGroundRect:{value:first.uGroundRect.value.clone()},uGroundMask:{value:null},uWetBank:{value:null},resolution:{value:requestedResolution}};
 const bakes=new Map();
 const mesh=new THREE.Mesh(geometry);mesh.frustumCulled=false;scene.add(mesh);
 const previous=r.getRenderTarget(),auto=r.autoClear,started=performance.now(),timer=new GpuTimer(r.getContext(),32);
 try{for(const material of materials){
  const selected=plan?.get(material);if(plan&&!selected)continue;
  const resolution=selected?.resolution??requestedResolution,flavor=selected?.flavor??requestedFlavor;
  if(![128,256,512,1024,2048].includes(resolution))throw Error('Invalid selected cache resolution');
  if(!bakes.has(flavor))bakes.set(flavor,new THREE.ShaderMaterial({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:flavor==='noise'?bakeFragment.replace('gl_FragColor=vec4(mossMix,cover,ao,rough);','gl_FragColor=vec4(region,baseCover,0.,1.);'):bakeFragment,depthTest:false,depthWrite:false,toneMapped:false}));
  const bake=bakes.get(flavor);mesh.material=bake;uniforms.resolution.value=resolution;
  const u=material.userData.biomeGround;if(!u?.uWetBank||u.uGroundPureMoss.value<.5)throw Error('Expected approved moss substrate');
  // Copy bounds: render origin changes live uniform values only during draws.
  uniforms.uGroundRect.value.copy(u.uGroundRect.value);uniforms.uGroundMask.value=u.uGroundMask.value;uniforms.uWetBank.value=u.uWetBank.value;bake.uniformsNeedUpdate=true;
  const target=new THREE.WebGLRenderTarget(resolution+2,resolution+2,{depthBuffer:false,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:true});
  target.texture.anisotropy=anisotropy;
  r.autoClear=true;const t=performance.now();
  timer.begin(stats.submissionsMs.length);
  try{r.setRenderTarget(target);r.render(scene,camera);}catch(e){target.dispose();throw e;}finally{r.setRenderTarget(previous);timer.end();}
  stats.materials++;stats.chunks.push({bounds:u.uGroundRect.value.toArray(),resolution,flavor});stats.submissionsMs.push(performance.now()-t);for(let side=resolution+2;side>=1;side=Math.floor(side/2))stats.bytes+=side*side*4;
  const prior=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader,renderer){prior.call(this,shader,renderer);let source=shader.fragmentShader;
   if(flavor==='noise'){
    const anchor='float qaRegion=materialNoise(vec3(qaWorld.x*.18,6.3,qaWorld.z*.18));';if(!source.includes(anchor))throw Error('Noise cache region anchor changed');
    source=source.replace(anchor,'vec4 qaCachedNoise=texture(uQaGroundCache,((worldP.xz-uGroundRect.xy)/48.*uQaCacheResolution+1.)/(uQaCacheResolution+2.));float qaRegion=qaCachedNoise.r;');
    const a=source.indexOf('vec2 ctxUV=((worldP.xz-uGroundRect.xy)'),b=source.indexOf('vec3 soilRaw=',a);if(a<0||b<a)throw Error('Noise cache substrate anchor changed');source=source.slice(0,a)+'float mossCover=qaCachedNoise.g;\n  '+source.slice(b);
   }else{const a=source.indexOf('if(uGroundPureMoss>.5){'),b=source.indexOf('if((uBiome>4.5',a);if(a<0||b<a)throw Error('Hybrid ground branch anchors changed');source=source.slice(0,a)+liveBranch+source.slice(b);}
   shader.uniforms.uQaGroundCache={value:target.texture};shader.uniforms.uQaCacheResolution={value:resolution};shader.fragmentShader='uniform sampler2D uQaGroundCache;uniform float uQaCacheResolution;\n'+source;};
  material.customProgramCacheKey=()=>key()+'|qa-hybrid-cache-v1-'+flavor;material.needsUpdate=true;
  material.addEventListener('dispose',()=>target.dispose());
  await new Promise(requestAnimationFrame);
 }
 const deadline=performance.now()+10000;while(timer.pending.length&&performance.now()<deadline){await new Promise(requestAnimationFrame);timer.poll();}stats.generationGpu=timer.report();
 }finally{timer.dispose();r.setRenderTarget(previous);r.autoClear=auto;geometry.dispose();for(const bake of bakes.values())bake.dispose();}
 stats.wallMs=performance.now()-started;return stats;
}

export async function installProjectedCache(w,nearResolution=null,anisotropy=1){
 w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);
 const {MangroveCacheProjection}=await import('./qa-mangrove-cache-projection-20261023.js');const planner=new MangroveCacheProjection(w),selection=planner.plan(),plan=new Map();
 for(const row of selection.rows){const material=w.chunks.get(row.key)?.children.find(o=>o.userData.ground)?.material;if(material)plan.set(material,nearResolution&&row.flavor==='noise'?{...row,resolution:nearResolution,flavor:'weights'}:row);}
 const stats=await installHybridCache(w,128,'weights',plan,anisotropy);stats.scope='QA projection selection frozen at installation; dynamic LOD and streaming not yet implemented';stats.selection=selection;return stats;
}

import * as THREE from 'three';
import {toonFunctions} from '/src/rendering/african-toon-source.js';
import {GpuTimer} from '/tests/browser/gpu-timer.js';

// Experiment only. RGBA = secondary moss weight, moss/soil weight, final AO,
// final roughness. Color and normal detail, lighting and shadows remain live.
const noise=toonFunctions.slice(toonFunctions.indexOf('float detailHash('),toonFunctions.indexOf('vec3 toLinear4('));
export const bakeFragment=`precision highp float;
uniform sampler2D uGroundARH,uLayerSandARH,uGroundMask,uWetBank;
uniform vec4 uGroundRect,uGroundParams;uniform vec2 uGroundSeed;
uniform float resolution;varying vec2 vUv;
${noise}
void main(){
 vec2 local=(vUv*(resolution+2.)-1.)/resolution;
 vec2 p=uGroundRect.xy+local*48.;
 vec2 uv=mat2(.8,-.6,.6,.8)*p*uGroundParams.x+uGroundSeed;
 vec2 dx=dFdx(uv),dy=dFdy(uv);
 vec2 uv2=vec2(-uv.y,uv.x)*.57+vec2(.371,.619);
 vec2 dx2=vec2(-dx.y,dx.x)*.57,dy2=vec2(-dy.y,dy.x)*.57;
 vec3 arh=textureGrad(uGroundARH,uv,dx*1.35,dy*1.35).rgb;
 vec3 arh2=textureGrad(uGroundARH,uv2,dx2*1.35,dy2*1.35).rgb;
 float region=materialNoise(vec3(p.x*.18,6.3,p.y*.18));
 float h=arh.b-arh2.b+(region-.5)*.8;
 float width=max(.055,fwidth(h)*1.2);
 float mossMix=smoothstep(-width,width,h);
 arh=mix(arh2,arh,mossMix);
 vec2 ctxUV=((p-uGroundRect.xy)/uGroundRect.z+1.5)/uGroundRect.w;
 vec4 ctx=texture2D(uGroundMask,ctxUV);
 float patchNoise=materialNoise(vec3(p.x*.12,3.7,p.y*.12));
 float cover=smoothstep(.30,.50,ctx.g*.64+ctx.r*.18+patchNoise*.18-ctx.a*.10);
 cover=mix(.38,.98,cover);
 float shoreDistance=texture2D(uWetBank,ctxUV).r*8.;
 float bankWet=(1.-smoothstep(.2,3.2,shoreDistance))*smoothstep(.20,.75,patchNoise);
 cover=mix(cover,.18,bankWet*.85);
 float baseCover=cover;
 vec3 soil=textureGrad(uLayerSandARH,uv,dx,dy).rgb;
 float hd=clamp((arh.b-186./255.)/(69./255.),-.5,.5)-clamp((soil.b-39./255.)/(123./255.),-.5,.5)+(cover*2.-1.)*1.4;
 float tw=max(.10,fwidth(hd)*1.5);
 cover=smoothstep(-tw,tw,hd);
 float ao=mix(mix(.65,1.,soil.r),mix(.45,1.,arh.r),cover);
 float rough=mix(clamp(soil.g,.78,.96),clamp(arh.g,.5,.99),cover);
 gl_FragColor=vec4(mossMix,cover,ao,rough);
}`;
const liveBranch=`if(uGroundPureMoss>.5){
 vec2 uv=mat2(.8,-.6,.6,.8)*worldP.xz*uGroundParams.x+uGroundSeed+mod(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x,1.);
 vec2 dx=dFdx(uv),dy=dFdy(uv);
 vec2 cacheUV=((worldP.xz-uGroundRect.xy)/48.*uQaCacheResolution+1.)/(uQaCacheResolution+2.);
 vec4 cached=texture(uQaGroundCache,cacheUV);
 vec3 tex=textureGrad(uGroundDetailMap,uv,dx*1.35,dy*1.35).rgb;
 vec3 mapN=textureGrad(uGroundNormal,uv,dx*1.35,dy*1.35).rgb*2.-1.;
 vec2 secondaryUV=uv+floor(mat2(.8,-.6,.6,.8)*uWorldOrigin*uGroundParams.x);
 vec2 uv2=vec2(-secondaryUV.y,secondaryUV.x)*.57+vec2(.371,.619),dx2=vec2(-dx.y,dx.x)*.57,dy2=vec2(-dy.y,dy.x)*.57;
 if(cached.r<1.){
  vec3 tex2=textureGrad(uGroundDetailMap,uv2,dx2*1.35,dy2*1.35).rgb;
  vec3 n2=textureGrad(uGroundNormal,uv2,dx2*1.35,dy2*1.35).rgb*2.-1.;n2.xy=vec2(-n2.y,n2.x);
  tex=mix(tex2,tex,cached.r);mapN=mix(n2,mapN,cached.r);
 }
 mapN=normalize(mapN);
 float fade=1.-smoothstep(.12,.60,max(length(dFdx(worldP)),length(dFdy(worldP))));
 color=tex*vec3(1.,1.03,.96);N=sampleTurfN410(Ng,mapN,uGroundParams.z*uGroundMicro*.8*fade);
 qaSoilWeight=1.-cached.g;
 if(qaSoilWeight>0.){
  vec3 soilRaw=textureGrad(uLayerSandBase,uv,dx,dy).rgb;
  vec3 soil=sRGBTransferOETF(vec4(toLinear4(soilRaw)*vec3(.58,.61,.64),1.)).rgb;
  vec3 soilN=textureGrad(uLayerSandNormal,uv,dx,dy).rgb*2.-1.;
  float soilRough=textureGrad(uLayerSandARH,uv,dx,dy).g;
  qaSoilAlbedo=toLinear4(soilRaw)*vec3(.58,.61,.64);qaSoilNormal=sampleTurfN410(Ng,soilN,.55*fade);qaSoilRough=max(.04,soilRough*.52);
  color=mix(soil,color,cached.g);N=normalize(mix(qaSoilNormal,N,cached.g));
 }
 rough=cached.a;wet=0.;materialAO410=cached.b;materialCover410=cached.g;return;
 }
 `;

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

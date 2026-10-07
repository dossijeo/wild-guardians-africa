import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {assetUrl} from '../../src/rendering/asset-url.js';
import {AfricanToon} from '../../src/rendering/african-toon.js';
import {SceneMaterialRegistry} from '../../src/rendering/material-registry.js';
import {NativeSky} from '../../src/rendering/sky.js';
import {installNativeShadow} from '../../src/rendering/native-shadow.js';
import {configureShadowCamera,updateShadowCamera} from '../../src/rendering/shadow-camera.js';
import {sampleFixedPose} from '../../src/rendering/fixed-pose.js';
import {syncWorkerToolVisibility} from '../../src/rendering/worker-tool-visibility.js';
const status=document.querySelector('#status');let renderer,cancelled=false;
function regions(mask,width,originalAlpha){
 const seen=new Uint8Array(mask.length),queue=new Uint32Array(mask.length),out=[];
 for(let seed=0;seed<mask.length;seed++){if(!mask[seed]||seen[seed])continue;let head=0,tail=1,minX=width,maxX=0,minY=width,maxY=0,contour=false;queue[0]=seed;seen[seed]=1;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=width){contour=true;continue;}const n=ny*width+nx;if(originalAlpha&&!originalAlpha[n])contour=true;if(mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n;}}
  }out.push({pixels:tail,diameterUpperBound:Math.hypot(maxX-minX,maxY-minY),bounds:[minX,minY,maxX,maxY],classification:originalAlpha?(contour?'contour':'interior'):'rgb'});
 }return out.sort((a,b)=>b.pixels-a.pixels);
}
document.querySelector('#stop').onclick=()=>{cancelled=true;renderer?.dispose();renderer?.forceContextLoss();status.textContent+='\nGPU liberada';};
document.querySelector('#run').onclick=async()=>{document.querySelector('#run').disabled=true;try{await campaign();}catch(error){status.textContent=error.stack;renderer?.dispose();renderer?.forceContextLoss();}};
async function campaign(){
 const size=1024;renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,preserveDrawingBuffer:true});renderer.setSize(size,size);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const options=new URLSearchParams(location.search),noShadows=options.has('noShadows'),positiveControl=options.has('doubleControl'),sourceTwin=options.has('sourceTwin'),originalShadow=options.has('originalShadow'),frontShadow=options.has('frontShadow'),maxSamples=Number(options.get('limit')??Infinity);renderer.shadowMap.enabled=!noShadows;
 document.querySelector('#view').append(renderer.domElement);const gl=renderer.getContext(),pixels=[new Uint8Array(size*size*4),new Uint8Array(size*size*4)];
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),library=await fetch('/content/worker-actions.json').then(r=>r.json());
 const models=await Promise.all([loader.loadAsync(assetUrl(library.youngMale.url)),loader.loadAsync(sourceTwin?assetUrl(library.youngMale.url):'/__frontside_candidate/youngMale')]);
 const originalIndexCounts=new Map();models[0].scene.traverse(mesh=>{if(mesh.isMesh)originalIndexCounts.set(mesh.name,mesh.geometry.index.count);});
 const sky=new NativeSky();await sky.load();const rigs=[];
 // One persistent native shadow hook/target, matching the world renderer. Never
 // dispose and recreate its fallback sampler between the paired captures.
 const scene=new THREE.Scene(),toon=new AfricanToon(),registry=new SceneMaterialRegistry(scene,toon);toon.environment(sky.environmentTextures,sky.uniforms.uSkyYaw);
 const sun=new THREE.DirectionalLight('#ffe2a8',3),ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);configureShadowCamera(sun);updateShadowCamera(sun,new THREE.Vector3());scene.add(sun,sun.target,ambient);
 const release=installNativeShadow(renderer,sun,toon.shadowUniforms);release.cache.enabled=false;
 for(let i=0;i<2;i++){
  models[i].scene.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;if(i===1&&!sourceTwin){mesh.material=mesh.material.clone();mesh.material.side=positiveControl?THREE.DoubleSide:THREE.FrontSide;mesh.material.shadowSide=frontShadow?THREE.FrontSide:THREE.DoubleSide;
   if(originalShadow){const count=originalIndexCounts.get(mesh.name);if(count===undefined)throw Error('Missing original geometry correspondence '+mesh.name);mesh.onBeforeShadow=()=>mesh.geometry.setDrawRange(0,count);mesh.onAfterShadow=()=>mesh.geometry.setDrawRange(0,Infinity);}
  }});
  scene.add(models[i].scene);rigs.push({scene,toon,registry,sun,ambient,release,model:models[i].scene,mixer:new THREE.AnimationMixer(models[i].scene),clips:models[i].animations});
 }
 const camera=new THREE.PerspectiveCamera(42,1,.01,100),linear=new Float32Array(256);for(let i=0;i<256;i++){const v=i/255;linear[i]=v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}
 const report={status:'VISUAL_SCREEN_NOT_APPROVED',resolution:size,shader:'AfricanToon+NativeSky endpoints+nativeShadow+Three r180 Standard maps+sampleFixedPose',source:'worker-actions.youngMale runtime web',candidate:'youngMale-selective-reverse-NOT-APPROVED-web.glb',candidateSide:positiveControl?'DoubleSide control':'FrontSide',maxSamples:Number.isFinite(maxSamples)?maxSamples:null,shadowSide:'DoubleSide color-isolation screen; FrontSide shadow pass remains required',shadowsEnabled:!noShadows,conditions:'CPU49032/39340 frozen, far58872 finished. No GPU timing.',samples:[],limitations:['Local isolated worker screen only; all cultures/biomes, diagnostic maps, exhaustive views, shadows and GPU benchmarks remain required.']};
 let failed=false;
 campaignLoop: for(const biome of ['sabana','manglares'])for(const night of [0,.5,1])for(const clipName of ['Idle','Water','Carry_Crate','Fall'])for(const fraction of [.125,.625])for(const elevation of [25,55])for(const azimuth of [22.5,67.5,157.5,247.5]){
  if(cancelled)throw Error('Cancelled');
  for(const rig of rigs){rig.action?.stop();const clip=rig.clips.find(c=>c.name===clipName);rig.action=rig.mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();rig.action.paused=true;rig.action.clampWhenFinished=true;sampleFixedPose(rig,clip.duration*fraction,true);syncWorkerToolVisibility(rig,true);rig.model.updateMatrixWorld(true);rig.sun.intensity=3-2.6*night;rig.ambient.intensity=2-.9*night;rig.toon.update(night,rig.sun,biome);rig.registry.update(0);}
  const box=new THREE.Box3().setFromObject(rigs[0].model),center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()*.5,a=azimuth*Math.PI/180,e=elevation*Math.PI/180;
  camera.position.copy(center).add(new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(radius*3));camera.lookAt(center);camera.updateMatrixWorld();
  const shadowPixels=[];
  for(let side=0;side<2;side++){const rig=rigs[side];rigs.forEach((r,i)=>r.model.visible=i===side);renderer.render(rig.scene,camera);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,pixels[side]);
   if(rig.sun.shadow.map){const map=rig.sun.shadow.map,packed=new Uint8Array(map.width*map.height*4);renderer.readRenderTargetPixels(map,0,0,map.width,map.height,packed);shadowPixels[side]=packed;}
   if(side===0&&!report.samples.length){const repeat=new Uint8Array(pixels[0].length);renderer.render(rig.scene,camera);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,repeat);let different=0,max=0;for(let i=0;i<repeat.length;i++){if(repeat[i]!==pixels[0][i])different++;max=Math.max(max,Math.abs(repeat[i]-pixels[0][i]));}report.unchangedOriginalControl={differentBytes:different,maxByteDifference:max};if(different)throw Error('Unchanged control has raster noise; no threshold interpretation');}
   }
  if(shadowPixels.length===2){let different=0,max=0,maxDepth=0,changedTexels=0;const changed=[];
   // Match r180 packing.glsl.js UnpackFactors4. A large packed byte delta
   // alone is not a large depth delta; carries can change several bytes.
   const unpack=(p,i)=>Math.min(1,p[i]/256+p[i+1]/65536+p[i+2]/16777216+p[i+3]/(255*16777216));
   for(let i=0;i<shadowPixels[0].length;i+=4){let differs=false;for(let c=0;c<4;c++){if(shadowPixels[0][i+c]!==shadowPixels[1][i+c]){different++;differs=true;}max=Math.max(max,Math.abs(shadowPixels[0][i+c]-shadowPixels[1][i+c]));}
    if(differs){changedTexels++;const a=unpack(shadowPixels[0],i),b=unpack(shadowPixels[1],i),delta=Math.abs(a-b);maxDepth=Math.max(maxDepth,delta);changed.push({x:(i/4)%1024,y:Math.floor(i/4/1024),originalDepth:a,candidateDepth:b,worldDepthDelta:delta*(sun.shadow.camera.far-sun.shadow.camera.near)});}}
   report.shadowPackedDifference={differentBytes:different,maxByteDifference:max,changedTexels,maxWorldDepthDelta:maxDepth*(sun.shadow.camera.far-sun.shadow.camera.near),changed};}
  let original=0,union=0,intersection=0,missing=0,added=0,error=0,channels=0,maxError=0;const tileError=new Float64Array(64*64),tileChannels=new Uint32Array(64*64),hist=new Uint32Array(256),rgbMask=new Uint8Array(size*size),missingMask=new Uint8Array(size*size),originalAlpha=new Uint8Array(size*size);
  for(let offset=0;offset<pixels[0].length;offset+=4){const aa=pixels[0][offset+3]>0,bb=pixels[1][offset+3]>0;if(aa)original++;if(aa&&bb)intersection++;if(aa&&!bb)missing++;if(!aa&&bb)added++;if(!(aa||bb))continue;union++;const pixel=offset/4,tile=(Math.floor(pixel/size/16)*64)+Math.floor(pixel%size/16);
   originalAlpha[pixel]=aa?1:0;missingMask[pixel]=aa&&!bb?1:0;
   for(let channel=0;channel<3;channel++){const delta=Math.abs(linear[pixels[0][offset+channel]]-linear[pixels[1][offset+channel]]);if(delta>.03)rgbMask[pixel]=1;error+=delta;channels++;maxError=Math.max(maxError,delta);tileError[tile]+=delta;tileChannels[tile]++;hist[Math.min(255,Math.ceil(delta*255))]++;}}
  let cumulative=0,p99=0;for(let i=0;i<hist.length;i++){cumulative+=hist[i];if(cumulative>=channels*.99){p99=i/255;break;}}
  const occupied=Array.from(tileError,(sum,i)=>tileChannels[i]?sum/tileChannels[i]:0),sample={biome,night,clip:clipName,fraction,azimuth,elevation,alphaIoU:intersection/Math.max(union,1),missingFraction:missing/Math.max(original,1),addedFraction:added/Math.max(original,1),linearRgbMae:error/Math.max(channels,1),p99Approx:p99,maxError,maxTileMae:Math.max(...occupied),originalPixels:original,missingPixels:missing,addedPixels:added};
  sample.rgbOutlierRegions=regions(rgbMask,size);sample.missingRegions=regions(missingMask,size,originalAlpha);
  sample.passes=sample.alphaIoU>=.9995&&sample.missingFraction<=.00025&&sample.addedFraction<=.0005&&sample.linearRgbMae<=.002&&sample.p99Approx<=.015&&sample.maxTileMae<=.01&&!sample.rgbOutlierRegions.some(r=>r.pixels>16)&&!sample.missingRegions.some(r=>r.pixels>4||r.diameterUpperBound>2);report.samples.push(sample);status.textContent=`${report.samples.length} muestras. ${clipName}/${fraction}, ${azimuth}°/${elevation}°: IoU${sample.alphaIoU.toFixed(6)}, MAE${sample.linearRgbMae.toFixed(6)} ${sample.passes?'pasa screen':'FALLA'}`;
  if(!sample.passes){failed=true;break campaignLoop;}
  if(report.samples.length>=maxSamples)break campaignLoop;
  await new Promise(requestAnimationFrame);
 }
 // Break nested campaign after failure by retaining only the first failure;
 // the early screen is rejection evidence and does not need a passing sweep.
 report.failed=failed;
 report.sourceTwin=sourceTwin;report.originalShadowDiagnostic=originalShadow;report.frontShadow=frontShadow;report.sharedPersistentShadowHook=true;
 // Export source, candidate and regional difference in a single PNG. Pixel
 // rows from GL are reversed for a normal upright canvas image.
 const comparison=document.createElement('canvas');comparison.width=size*3;comparison.height=size;const ctx=comparison.getContext('2d');
 for(let side=0;side<3;side++){const image=ctx.createImageData(size,size);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const input=((size-1-y)*size+x)*4,output=(y*size+x)*4;
  for(let c=0;c<3;c++)image.data[output+c]=side<2?pixels[side][input+c]:Math.min(255,Math.abs(pixels[0][input+c]-pixels[1][input+c])*8);image.data[output+3]=255;}ctx.putImageData(image,side*size,0);}
 report.capturePng=comparison.toDataURL('image/png');
 const response=await fetch('/__frontside_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error(await response.text());
 release();registry.dispose();sky.dispose();renderer.dispose();renderer.forceContextLoss();status.textContent=`Screen guardado: ${report.samples.length} muestras, ${failed?'rechazo':'pendiente gates completos'}. GPU liberada. NO aprobado.`;
}

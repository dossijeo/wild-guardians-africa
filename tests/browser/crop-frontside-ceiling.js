// Isolated QA only. No repaired geometry, production settings or persistent game state.
import * as THREE from 'three';
import {Assets,json} from '../../src/rendering/assets.js';
import {createCropBatch} from '../../src/rendering/crop-batch.js';
import {cropSpec} from '../../src/simulation/rules.js';
import {AfricanToon} from '../../src/rendering/african-toon.js';
import {NativeSky} from '../../src/rendering/sky.js';
import {installNativeShadow} from '../../src/rendering/native-shadow.js';
import {configureShadowCamera,updateShadowCamera} from '../../src/rendering/shadow-camera.js';
import {GpuTimer} from './gpu-timer.js';
const status=document.querySelector('#status'),report=document.querySelector('#report'),button=document.querySelector('#run');
const output={scope:'Synthetic dense crop-only farm: original native 8 species, 1600 plants; fixed growth, camera, native wind clock=17, day shader/HDR, media 1024 shadow map. No workers, terrain chunks, HUD, simulation or repaired assets. Forced FrontSide visual invalidity expressly ignored. Total is this isolated scene, not full-game GPU time.',blocks:[],errors:[]};
const publish=()=>report.textContent=JSON.stringify(output,null,2),assert=(v,m)=>{if(!v)throw Error(m);},raf=()=>new Promise(requestAnimationFrame);
addEventListener('error',e=>{output.errors.push(e.message);publish();});addEventListener('unhandledrejection',e=>{output.errors.push(String(e.reason));publish();});
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,alpha:false});renderer.setPixelRatio(1);renderer.setSize(1280,720,false);renderer.setClearColor('#cbd5be');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.info.autoReset=false;
const gl=renderer.getContext(),scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
const camera=new THREE.PerspectiveCamera(50,1280/720,.1,300);camera.position.set(33,34,45);camera.lookAt(0,1,0);camera.updateMatrixWorld();
const sun=new THREE.DirectionalLight('#ffe2a8',3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);configureShadowCamera(sun);updateShadowCamera(sun,new THREE.Vector3());scene.add(sun,sun.target,new THREE.HemisphereLight('#ebf1d9','#765b3b',2));
const toon=new AfricanToon(),releaseShadow=installNativeShadow(renderer,sun,toon.shadowUniforms);releaseShadow.cache.enabled=false;
let shadowTimer=null,shadowFrame=0,lastShadowSubmission=null;
const originalShadowRender=renderer.shadowMap.render;
renderer.shadowMap.render=function(...args){const before={...renderer.info.render};if(shadowTimer)assert(shadowTimer.begin(shadowFrame),'Shadow query begin failed');try{return originalShadowRender.apply(this,args);}finally{if(shadowTimer)shadowTimer.end();const after=renderer.info.render;lastShadowSubmission={calls:after.calls-before.calls,triangles:after.triangles-before.triangles};}};
const assets=new Assets(),sky=new NativeSky();await sky.load();toon.environment(sky.environmentTextures,sky.uniforms.uSkyYaw);toon.update(false,sun,'sabana');
const descriptor=(await json('/content/models.json')).find(m=>m.source==='Bioma_Cultivos_Lab_V3_Morph_Local.html#assetData');assert(descriptor,'Original crop descriptor');
const original=await assets.model(descriptor.url),bridges=await json('/content/crop-bridges.json');
const species=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'],ratios=[.03,.16,.38,.64,.9,1];
const plants=Array.from({length:1600},(_,i)=>({id:'ceiling-'+i,species:species[i%8],alive:true,x:(i%40-19.5)*1.05,z:(Math.floor(i/40)-19.5)*1.05,growth:cropSpec(species[i%8]).growth_seconds*ratios[Math.floor(i/8)%6],rotation:(i*2.399963)%Math.PI*2}));
const batch=createCropBatch(group,renderer,original,bridges,256);batch.update(plants,17,()=>0);toon.apply(group);
const meshes=[];group.traverse(m=>{if(m.isInstancedMesh)meshes.push(m);});
const saved=meshes.map(m=>({m,material:m.material,side:m.material.side,shadowSide:m.material.shadowSide,depthSide:m.customDepthMaterial.side}));
assert(saved.every(s=>s.side===THREE.DoubleSide&&s.shadowSide===THREE.DoubleSide&&s.depthSide===THREE.DoubleSide),'All native baseline sides must be DoubleSide');
const identity=()=>JSON.stringify(meshes.map(m=>({id:m.uuid,geometry:m.geometry.uuid,count:m.count,index:m.geometry.index?.count??0,position:m.geometry.attributes.position.count,matrixVersion:m.instanceMatrix.version,growthVersion:m.geometry.attributes.iGrowth?.version??m.geometry.attributes.iBridge?.version})));
const invariant=identity();
const depthTarget=new THREE.WebGLRenderTarget(1280,720);
const inventory=meshes.map(m=>({name:m.name,count:m.count,trianglesPerInstance:(m.geometry.index?.count??m.geometry.attributes.position.count)/3,bridge:!!m.geometry.attributes.iBridge}));
const rendererInfo=gl.getExtension('WEBGL_debug_renderer_info');output.context={userAgent:navigator.userAgent,renderer:rendererInfo?gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL):null,buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],attributes:gl.getContextAttributes(),camera:camera.position.toArray(),target:[0,1,0],asset:descriptor.url,inventory,plants:plants.length,meshInstances:inventory.reduce((a,m)=>a+m.count,0),triangles:inventory.reduce((a,m)=>a+m.count*m.trianglesPerInstance,0)};
function arm(front){for(const s of saved){s.m.material=s.material;s.material.side=front?THREE.FrontSide:s.side;s.material.shadowSide=front?THREE.FrontSide:s.shadowSide;s.material.needsUpdate=true;s.m.customDepthMaterial.side=front?THREE.FrontSide:s.depthSide;s.m.customDepthMaterial.needsUpdate=true;}}
function draw(mode){renderer.info.reset();if(mode==='depth'){renderer.shadowMap.enabled=false;renderer.setRenderTarget(depthTarget);for(const m of meshes)m.material=m.customDepthMaterial;renderer.render(scene,camera);for(const s of saved)s.m.material=s.material;renderer.setRenderTarget(null);renderer.shadowMap.enabled=true;}
 else if(mode==='shadow'){renderer.shadowMap.autoUpdate=true;renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);}
 else{renderer.shadowMap.autoUpdate=mode==='total';renderer.shadowMap.needsUpdate=mode==='total';renderer.render(scene,camera);}}
async function warm(mode,n){for(let i=0;i<n;i++){await raf();assert(!document.hidden,'Benchmark tab must remain visible');draw(mode);}}
async function drain(timer){for(let i=0;i<120&&timer.report().pending;i++){await raf();timer.poll();}const r=timer.report();assert(r.pending===0,'Unresolved queries');return r;}
const summarize=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,median:(s[(s.length-1)>>1]+s[s.length>>1])/2,p95:s[Math.ceil(s.length*.95)-1]};};
draw('total');status.textContent='Ready: original crop-only dense farm';button.disabled=false;publish();
button.onclick=async()=>{button.disabled=true;output.startedAt=new Date().toISOString();try{
 const support=new GpuTimer(gl);assert(support.report().supported,'GPU elapsed timer queries unavailable');support.dispose();
 // Compile both arms and every path before measuring; no inter-arm shader compilation in samples.
 for(const front of [false,true]){arm(front);for(const mode of ['total','color','depth','shadow'])await warm(mode,12);}
 for(const mode of ['total','color','depth','shadow'])for(const [block,letter] of [...'ABBABAAB'].entries()){
  const front=letter==='B';arm(front);draw('total');await warm(mode,30);const timer=new GpuTimer(gl,64);const cpu=[],submissions=[];
  status.textContent=`${mode}: ${letter} block ${block+1}/8`;
  for(let frame=0;frame<120;frame++){await raf();assert(!document.hidden,'Hidden tab');assert(identity()===invariant,'Geometry/instances changed');if(mode==='shadow'){shadowTimer=timer;shadowFrame=frame;}else assert(timer.begin(frame),'Query begin failed');const start=performance.now();draw(mode);cpu.push(performance.now()-start);if(mode==='shadow')shadowTimer=null;else timer.end();if(frame===0)submissions.push(mode==='shadow'?{...lastShadowSubmission}:{...renderer.info.render});}
  const gpu=await drain(timer);assert(gpu.samples.length===120&&!gpu.disjointEvents&&!gpu.discarded&&!gpu.overflowSkipped&&!gpu.foreignQuerySkipped&&!gpu.allocationFailures,'Invalid GPU query block');timer.dispose();
  output.blocks.push({mode,block,arm:letter,front,summary:summarize(gpu.samples.map(s=>s.ms)),cpuSubmit:summarize(cpu),submissions,gpu});publish();
 }
 output.finishedAt=new Date().toISOString();output.summary=Object.fromEntries(['total','color','depth','shadow'].map(mode=>{const lots=output.blocks.filter(b=>b.mode===mode),a=lots.filter(b=>b.arm==='A').flatMap(b=>b.gpu.samples.map(s=>s.ms)),b=lots.filter(b=>b.arm==='B').flatMap(b=>b.gpu.samples.map(s=>s.ms));const A=summarize(a),B=summarize(b);return [mode,{A,B,savedMs:A.mean-B.mean,savedPercent:100*(A.mean-B.mean)/A.mean,paired:lots.reduce((pairs,lot,i)=>{if(i%2===0){const other=lots[i+1],aa=lot.arm==='A'?lot:other,bb=lot.arm==='B'?lot:other;pairs.push({order:lot.arm+other.arm,savedMs:aa.summary.mean-bb.summary.mean,savedPercent:100*(aa.summary.mean-bb.summary.mean)/aa.summary.mean});}return pairs;},[])}];}));
 output.glError=gl.getError();assert(output.glError===gl.NO_ERROR,'GL error');output.completed=true;status.textContent='Complete; originals restored';
 }catch(e){output.errors.push(String(e.stack??e));status.textContent='Failed: '+e;}finally{shadowTimer=null;arm(false);renderer.shadowMap.autoUpdate=true;draw('total');output.restored=saved.every(s=>s.m.material===s.material&&s.material.side===s.side&&s.material.shadowSide===s.shadowSide&&s.m.customDepthMaterial.side===s.depthSide)&&identity()===invariant;publish();}};
addEventListener('pagehide',()=>{releaseShadow();batch.dispose();assets.disposeModels();sky.dispose();depthTarget.dispose();renderer.dispose();},{once:true});

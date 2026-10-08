import * as THREE from 'three';
import {Assets} from '../../src/rendering/assets.js';
import {cropSpec} from '../../src/simulation/rules.js';
import {AfricanToon} from '../../src/rendering/african-toon.js';
import {SceneMaterialRegistry} from '../../src/rendering/material-registry.js';
import {NativeSky} from '../../src/rendering/sky.js';
import {installNativeShadow} from '../../src/rendering/native-shadow.js';
import {configureShadowCamera,updateShadowCamera} from '../../src/rendering/shadow-camera.js';
import {createQaResourceScope} from '../../tools/lib/frontside-qa-resource-scope.mjs';
import {createBridgeIndexRuntimeRigs} from '../../tools/lib/frontside-bridge-index-runtime-rigs.mjs';
import {bridgeIndexReviewCases} from '../../tools/lib/frontside-bridge-index-review-cases.mjs';
import {attachHumanVisualReview} from '../../tools/lib/frontside-human-visual-review.mjs';
const status=document.querySelector('#status'),button=document.querySelector('#run'),size=1024;
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
let scope,renderer,running=false;
function byteDiagnostic(a,b){let changedBytes=0,changedRgbPixels=0,changedAlphaPixels=0,maxChannelDelta=0,totalRgbDelta=0;for(let p=0;p<a.length/4;p++){let rgb=false;for(let c=0;c<4;c++){const delta=Math.abs(a[p*4+c]-b[p*4+c]);changedBytes+=delta>0;maxChannelDelta=Math.max(maxChannelDelta,delta);if(c<3){rgb||=delta>0;totalRgbDelta+=delta;}else changedAlphaPixels+=delta>0;}changedRgbPixels+=rgb;}return{changedBytes,changedRgbPixels,changedAlphaPixels,maxChannelDelta,meanRgbChannelByteDelta:totalRgbDelta/(a.length/4*3),meaning:'Diagnostic readback differences only; no automatic visual acceptance or rejection.'};}
async function run(){
 if(running)return;running=true;button.disabled=true;scope=createQaResourceScope();let report;
 try{
  const query=new URLSearchParams(location.search),caseIndex=Number(query.get('caseIndex')??0);if([...query.keys()].some(k=>!['caseIndex','cpuCampaigns'].includes(k))||!Number.isInteger(caseIndex)||!bridgeIndexReviewCases[caseIndex])throw Error('Unexpected prospective bridge control case');
  const sample=bridgeIndexReviewCases[caseIndex];status.textContent='Cargando originales; ningún derivado FrontSide.';
  const [models,mapping]=await Promise.all([fetch('/content/models.json').then(r=>r.json()),fetch('/content/manifests/web-assets.json').then(r=>r.json())]);scope.assertOpen();
  const sourceSha256='be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef',record=mapping.records.find(r=>r.sourceSha256===sourceSha256),url=models.find(m=>m.source.includes('Cultivos'))?.url;
  if(!record||url?.replace(/^\//,'')!==record.runtime)throw Error('Native source/runtime mapping mismatch');
  const [sourceBytes,bridgeBytes]=await Promise.all([fetch('/'+url.replace(/^\//,'')).then(r=>{if(!r.ok)throw Error('Runtime source unavailable');return r.arrayBuffer();}),fetch('/content/crop-bridges.json').then(r=>{if(!r.ok)throw Error('Bridge metadata unavailable');return r.arrayBuffer();})]);scope.assertOpen();
  const runtimeSha256=await digest(sourceBytes),bridgeSha256=await digest(bridgeBytes);if(runtimeSha256!==record.runtimeSha256||bridgeSha256!=='88c4bdb959b1debb7456e6c1708840330b459a6ede6649e8f690583953428309')throw Error('Source or regional-driver bytes changed');
  const bridges=JSON.parse(new TextDecoder().decode(bridgeBytes));
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});scope.defer('renderer context',()=>renderer.forceContextLoss());scope.defer('renderer resources',()=>renderer.dispose());renderer.setSize(size,size);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.querySelector('#view').append(renderer.domElement);
  const gl=renderer.getContext(),assets=new Assets();scope.defer('source Assets',()=>assets.disposeModels());const gltf=await assets.model(url);scope.assertOpen();
  const scene=new THREE.Scene(),toon=new AfricanToon(),registry=new SceneMaterialRegistry(scene,toon);scope.defer('material registry',()=>registry.dispose());const sky=new NativeSky();scope.defer('NativeSky',()=>sky.dispose());await sky.load();scope.assertOpen();toon.environment(sky.environmentTextures,sky.uniforms.uSkyYaw);
  const sun=new THREE.DirectionalLight('#ffe2a8',3),ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);configureShadowCamera(sun);updateShadowCamera(sun,new THREE.Vector3());scene.add(sun,sun.target,ambient);scope.defer('directional shadow targets',()=>sun.shadow.dispose());const release=installNativeShadow(renderer,sun,toon.shadowUniforms);scope.defer('native shadow hook',()=>release());release.cache.enabled=false;
  sun.intensity=3-2.6*sample.night;ambient.intensity=2-.9*sample.night;toon.update(sample.night,sun,sample.biome);
  const runtime=createBridgeIndexRuntimeRigs({scene,renderer,gltf,bridges,scope,wrapSourceMaterials:()=>registry.update(sample.clock)});
  const effectiveShadowDraws=[];let arm=0;
  for(const rig of runtime.rigs)rig.group.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;const previous=mesh.onBeforeShadow;mesh.onBeforeShadow=function(...args){previous?.apply(this,args);effectiveShadowDraws.push({arm,mesh:this.name,instances:this.count,depthSide:args[5]?.side,materialType:args[5]?.type});};});
  runtime.update([{id:'bridge-index-source-control',species:'maiz',x:0,z:0,growth:sample.growth*cropSpec('maiz').growth_seconds}],sample.clock,()=>0);
  const phase=runtime.rigs[0].batch.sample('maiz',sample.growth*cropSpec('maiz').growth_seconds);if(phase.phase!=='morph'||runtime.rigs.some(r=>!r.target.visible||r.target.count!==1))throw Error('Requested native bridge is not active');
  const camera=new THREE.PerspectiveCamera(35,1,.01,100),center=new THREE.Vector3(0,phase.height*.5,0),az=sample.azimuth*Math.PI/180,el=sample.elevation*Math.PI/180;camera.position.copy(center).add(new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(Math.max(.65,phase.height*.7)*3));camera.lookAt(center);camera.updateMatrixWorld();
  report=attachHumanVisualReview({status:'VISUAL_SCREEN_NOT_APPROVED',cropVisual:true,originalBridgeIndexHuman:true,viewProfile:'ORIGINAL_BRIDGE_INDEX_DOUBLE_REVIEW_V1',source:url,sourceOriginal:record.source,runtimeSource:record.runtime,sourceSha256,runtimeSha256,bridgeSha256,viewCaseIndex:caseIndex,prospectiveCase:sample,arms:['native original nonindexed DoubleSide','same original indexed DoubleSide'],phase:{phase:phase.phase,stage:phase.stage},runtime:runtime.snapshot(),contextAttributes:gl.getContextAttributes(),controls:[],drawInfo:[],errors:[],campaignConditions:{cpuCampaigns:query.get('cpuCampaigns')??'unspecified',gpuTiming:false},limitations:['Original maize03→04 bridge only, with original regional-driver metadata and live instance binding.','No new/reversed faces, changed UV/normal/material/rig or FrontSide.','Native crop/toon/texture/sky/shadow recipes in an isolated two-arm fixture; no whole-World approval.','Static CPU storage is not resident GPU memory, invocation count or net benefit.','Numeric diagnostics do not decide perceptual acceptance; human review remains pending.']});
  const frames=[];
  for(arm=0;arm<2;arm++){runtime.select(arm);renderer.info.reset();renderer.render(scene,camera);report.drawInfo.push({arm,...renderer.info.render});const pixels=new Uint8Array(size*size*4);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,pixels);frames.push(pixels);if(arm===0)for(let repeat=0;repeat<3;repeat++){renderer.render(scene,camera);const bytes=new Uint8Array(pixels.length);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,bytes);report.controls.push(byteDiagnostic(pixels,bytes));}}
  report.comparison=byteDiagnostic(frames[0],frames[1]);report.effectiveShadowDraws=effectiveShadowDraws;
  const film=document.createElement('canvas');film.width=size*2;film.height=size;const ctx=film.getContext('2d');frames.forEach((pixels,column)=>{const image=ctx.createImageData(size,size);for(let y=0;y<size;y++)image.data.set(pixels.subarray((size-y-1)*size*4,(size-y)*size*4),y*size*4);ctx.putImageData(image,column*size,0);});report.capturePng=film.toDataURL('image/png');const retained=new Image();retained.src=report.capturePng;retained.alt=report.arms.join('; ');await retained.decode();document.querySelector('#view').replaceChildren(retained);
  report.cleanup={...scope.cleanup(),contextLost:gl.isContextLost()};const response=await fetch('/__frontside_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error(await response.text());status.textContent='Control DoubleSide guardado; GPU liberada. REVISIÓN VISUAL/FUNCIONAL NATIVA pendiente; no FrontSide ni benchmark.';
 }catch(error){const cleanup=scope?.cleanup();status.textContent=String(error.stack??error)+'\nCleanup '+JSON.stringify(cleanup);}
}
button.onclick=run;button.disabled=false;status.textContent='Preparado; no WebGL hasta ejecutar el control DoubleSide.';addEventListener('pagehide',()=>scope?.cleanup(),{once:true});

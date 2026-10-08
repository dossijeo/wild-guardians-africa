import {attachHumanVisualReview} from '../../tools/lib/frontside-human-visual-review.mjs';
import * as THREE from 'three';
import {Assets} from '../../src/rendering/assets.js';
import {createCropBatch} from '../../src/rendering/crop-batch.js';
import {cropSpec} from '../../src/simulation/rules.js';
import {AfricanToon} from '../../src/rendering/african-toon.js';
import {SceneMaterialRegistry} from '../../src/rendering/material-registry.js';
import {NativeSky} from '../../src/rendering/sky.js';
import {installNativeShadow} from '../../src/rendering/native-shadow.js';
import {configureShadowCamera,updateShadowCamera} from '../../src/rendering/shadow-camera.js';
import {loadSupportedFieldData,createSupportedFieldTextures,createSupportedFieldGeometry} from '../../tools/lib/frontside-supported-field-data.mjs';
import {createSourceFineFieldMaterial} from '../../tools/lib/frontside-source-fine-field-material.mjs';
import {createQaResourceScope} from '../../tools/lib/frontside-qa-resource-scope.mjs';
import {createSourceFineReport} from '../../tools/lib/frontside-source-fine-report-data.mjs';
import {regions,alphaDistanceGate,accumulateControlEnvelope,controlEnvelopeMetrics} from '../../tools/lib/frontside-visual-metrics.mjs';
const size=1024,status=document.querySelector('#status'),linear=Float64Array.from({length:256},(_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});let renderer,activeScope,lastCleanup;
function metrics(a,b,envelope){
 let source=0,union=0,intersection=0,missing=0,added=0,error=0,channels=0;const hist=new Uint32Array(256),tiles=new Float64Array(4096),counts=new Uint32Array(4096),missingMask=new Uint8Array(size*size),alpha=new Uint8Array(size*size),rgb=new Uint8Array(size*size);
 for(let p=0;p<size*size;p++){const o=p*4,aa=!!a[o+3],bb=!!b[o+3];source+=aa;intersection+=aa&&bb;missing+=aa&&!bb;added+=!aa&&bb;if(!aa&&!bb)continue;union++;alpha[p]=aa;missingMask[p]=aa&&!bb;const tile=Math.floor(p/size/16)*64+Math.floor(p%size/16);for(let c=0;c<3;c++){const delta=Math.abs(linear[a[o+c]]-linear[b[o+c]])+envelope[p*3+c];error+=delta;channels++;tiles[tile]+=delta;counts[tile]++;hist[Math.min(255,Math.ceil(delta*255))]++;if(delta>.03)rgb[p]=1;}}
 let cumulative=0,p99=0;for(let i=0;i<256;i++){cumulative+=hist[i];if(cumulative>=channels*.99){p99=i/255;break;}}
 const out={alphaIoU:intersection/Math.max(union,1),missingPixels:missing,addedPixels:added,missingFraction:missing/Math.max(source,1),addedFraction:added/Math.max(source,1),linearRgbMae:error/Math.max(channels,1),p99Approx:p99,maxTileMae:Math.max(...Array.from(tiles,(v,i)=>counts[i]?v/counts[i]:0)),missingRegions:regions(missingMask,size,alpha),rgbOutlierRegions:regions(rgb,size),alphaDistanceGate:alphaDistanceGate(a,b,size)};
 out.passes=out.alphaIoU>=.9995&&out.missingFraction<=.00025&&out.addedFraction<=.0005&&out.alphaDistanceGate.passes&&out.linearRgbMae<=.002&&out.p99Approx<=.015&&out.maxTileMae<=.01&&!out.missingRegions.some(r=>r.pixels>4||r.diameterUpperBound>2)&&!out.rgbOutlierRegions.some(r=>r.pixels>16);return out;
}
async function run(){
 const scope=createQaResourceScope();activeScope=scope;let report;
 try{
 const options=new URLSearchParams(location.search);if(options.get('limit')!=='1'||options.size>2||[...options.keys()].some(k=>!['limit','cpuCampaigns'].includes(k)))throw Error('Only isolated TRAINING limit1 and declared CPU conditions are supported');
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});scope.defer('renderer context',()=>renderer.forceContextLoss());scope.defer('renderer resources',()=>renderer.dispose());renderer.setSize(size,size);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.querySelector('#view').append(renderer.domElement);
 const gl=renderer.getContext(),assets=new Assets();scope.defer('source Assets',()=>assets.disposeModels());const manifest=await fetch('/content/models.json').then(r=>r.json());scope.assertOpen();const url=manifest.find(m=>m.source.includes('Cultivos')).url;
 const [gltf,bridges,data,webMapping]=await Promise.all([assets.model(url),fetch('/content/crop-bridges.json').then(r=>r.json()),loadSupportedFieldData('/docs/qa/frontside-model-pilot/maize-mature-supported-field-tables.json'),fetch('/content/manifests/web-assets.json').then(r=>r.json())]);
 const mappingRecord=webMapping.records.find(r=>r.source===data.metadata.source);
 scope.assertOpen();
 if(url.split('/').at(-1)!==data.metadata.source.split('/').at(-1))throw Error('Source manifest mismatch');
 const scene=new THREE.Scene(),toon=new AfricanToon(),registry=new SceneMaterialRegistry(scene,toon);scope.defer('material registry',()=>registry.dispose());const sky=new NativeSky();scope.defer('NativeSky',()=>sky.dispose());await sky.load();scope.assertOpen();toon.environment(sky.environmentTextures,sky.uniforms.uSkyYaw);
 const sun=new THREE.DirectionalLight('#ffe2a8',3),ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);configureShadowCamera(sun);updateShadowCamera(sun,new THREE.Vector3());scene.add(sun,sun.target,ambient);
 scope.defer('directional shadow targets',()=>sun.shadow.dispose());const release=installNativeShadow(renderer,sun,toon.shadowUniforms);scope.defer('native shadow hook',()=>release());release.cache.enabled=false;
 const rigs=[];
 for(let arm=0;arm<4;arm++){
  const group=new THREE.Group(),batch=createCropBatch(group,renderer,gltf,bridges,2);scope.defer('crop batch '+arm,()=>batch.dispose());scene.add(group);
  const original=group.getObjectByName('maiz_05_maduro');if(!original?.isInstancedMesh)throw Error('Mature source mesh missing');
  let fine=null;
  if(arm){
   const source=original.geometry,fallback=createSupportedFieldGeometry('fallback',source,data);scope.defer('fallback geometry '+arm,()=>fallback.dispose());const fineGeometry=createSupportedFieldGeometry('sourceFine',source,data);scope.defer('fine geometry '+arm,()=>fineGeometry.dispose());
   // The batch closure retains the original geometry/labels for procedural
   // bridges. The replacement borrows iGrowth; source attributes are immutable.
   original.geometry=fallback;let material=original.material;
   if(arm>1){const field=await createSupportedFieldTextures(source,data,renderer);scope.defer('field textures '+arm,()=>field.dispose());scope.assertOpen();material=createSourceFineFieldMaterial(original.material,field.textures,{lookup:arm===2?'direct':'grid'});const ownedMaterial=material;scope.defer('field material '+arm,()=>ownedMaterial.dispose());}
   fine=new THREE.InstancedMesh(fineGeometry,material,2);fine.name='QA sourceFine '+arm;fine.instanceMatrix=original.instanceMatrix;fine.castShadow=original.castShadow;fine.receiveShadow=original.receiveShadow;fine.frustumCulled=false;fine.customDepthMaterial=original.customDepthMaterial;
   // These materials already include the original toon hook. Registry must
   // not wrap that recipe again when this private control child is attached.
   fine.userData.materialRegistryExcluded=true;original.add(fine);const ownedFine=fine;scope.defer('fine instance '+arm,()=>{original.remove(ownedFine);ownedFine.dispose();});
  }
  rigs.push({group,batch,original,fine});
 }
 const sample={growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25},camera=new THREE.PerspectiveCamera(35,1,.01,100);
 for(const rig of rigs){rig.batch.update([{id:'1',species:'maiz',x:0,z:0,growth:cropSpec('maiz').growth_seconds}],sample.clock,()=>0);if(rig.fine)rig.fine.count=rig.original.count;}
 toon.update(sample.night,sun,sample.biome);registry.update(sample.clock);
 const height=rigs[0].batch.sample('maiz',cropSpec('maiz').growth_seconds).height,center=new THREE.Vector3(0,height*.5,0),a=sample.azimuth*Math.PI/180,e=sample.elevation*Math.PI/180;camera.position.copy(center).add(new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(Math.max(.65,height*.7)*3));camera.lookAt(center);camera.updateMatrixWorld();
 report=createSourceFineReport({source:url,mappingRecord,metadata:data.metadata,sample,cpuCampaigns:options.get('cpuCampaigns'),contextAttributes:gl.getContextAttributes()});
 const pixels=[],envelope=new Float64Array(size*size*3);let invalid=false;
 for(let arm=0;arm<4;arm++){
  rigs.forEach((r,i)=>r.group.visible=i===arm);renderer.render(scene,camera);const frame=new Uint8Array(size*size*4);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,frame);pixels.push(frame);report.drawInfo.push({...renderer.info.render});
  if(arm===0){let changedAlpha=0;for(let j=0;j<3;j++){renderer.render(scene,camera);const repeat=new Uint8Array(frame.length);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,repeat);const m=accumulateControlEnvelope(envelope,frame,repeat,linear);report.controls.push(m);changedAlpha+=m.alphaDifferences;}report.control=controlEnvelopeMetrics(envelope,frame,size);if(changedAlpha||!report.control.passes){invalid=true;report.sourceRepeatDiagnostic=true;}}
  else{const comparison={arm,...metrics(pixels[0],frame,envelope)};report.comparisons.push(comparison);}
 }
 const canvas=document.createElement('canvas');canvas.width=size*pixels.length;canvas.height=size;const ctx=canvas.getContext('2d');pixels.forEach((frame,arm)=>{const image=ctx.createImageData(size,size);for(let y=0;y<size;y++)image.data.set(frame.subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);ctx.putImageData(image,arm*size,0);});report.capturePng=canvas.toDataURL('image/png');report.sourceRepeatDiagnostic=invalid;
 const retained=document.createElement('img');retained.src=report.capturePng;await retained.decode();document.querySelector('#view').replaceChildren(retained);
 scope.assertOpen();report.cleanup=scope.cleanup();report.contextLost=gl.isContextLost();
 attachHumanVisualReview(report);
 const details=document.createElement('details'),summary=document.createElement('summary'),payload=document.createElement('pre');summary.textContent='Informe medido antes de POST — NOT APPROVED';const {capturePng,...visibleReport}=report;payload.textContent=JSON.stringify(visibleReport,null,2);details.append(summary,payload);document.querySelector('#view').after(details);
 const response=await fetch('/__frontside_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error(await response.text());status.textContent=JSON.stringify({controls:report.control,comparisons:report.comparisons,cleanup:report.cleanup,contextLost:report.contextLost},null,2)+'\nExportado. GPU liberada. REVISIÓN HUMANA PENDIENTE.';
 }finally{lastCleanup=scope.cleanup();if(activeScope===scope)activeScope=null;}
}
document.querySelector('#stop').onclick=()=>{const cleanup=activeScope?.cleanup();status.textContent+='\nCancelado; recursos liberados '+JSON.stringify(cleanup);};
document.querySelector('#run').onclick=async()=>{document.querySelector('#run').disabled=true;try{await run();}catch(e){status.textContent=e.stack+'\nCleanup '+JSON.stringify(lastCleanup);}};
document.querySelector('#run').disabled=false;status.textContent='Preparado: original fino DoubleSide; módulo QA cargado';

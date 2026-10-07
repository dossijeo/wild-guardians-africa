import * as THREE from 'three';
import {Assets} from '../../src/rendering/assets.js';
import {createCropBatch} from '../../src/rendering/crop-batch.js';
import {cropSpec} from '../../src/simulation/rules.js';
import {AfricanToon} from '../../src/rendering/african-toon.js';
import {SceneMaterialRegistry} from '../../src/rendering/material-registry.js';
import {NativeSky} from '../../src/rendering/sky.js';
import {installNativeShadow} from '../../src/rendering/native-shadow.js';
import {configureShadowCamera,updateShadowCamera} from '../../src/rendering/shadow-camera.js';
import {indexBridgeGeometry,reverseIndexedState,patchReverseDerivativeFrame} from '../../tools/lib/frontside-indexed-bridge.mjs';
import {regions,alphaDistanceGate,accumulateControlEnvelope,controlEnvelopeMetrics} from '../../tools/lib/frontside-visual-metrics.mjs';
import {mapColorProvenance} from '../../tools/lib/frontside-color-provenance.mjs';
const status=document.querySelector('#status'),size=1024,linear=Float64Array.from({length:256},(_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});let renderer,cancelled=false;
document.querySelector('#stop').onclick=()=>{cancelled=true;renderer?.dispose();renderer?.forceContextLoss();status.textContent+='\nGPU liberada';};
document.querySelector('#run').onclick=async()=>{document.querySelector('#run').disabled=true;try{await run();}catch(e){status.textContent=e.stack;renderer?.dispose();renderer?.forceContextLoss();}};
function colorMetrics(a,b,envelope){
 let source=0,union=0,intersection=0,missing=0,added=0,error=0,channels=0,nominalError=0;const hist=new Uint32Array(256),tiles=new Float64Array(4096),nominalTiles=new Float64Array(4096),counts=new Uint32Array(4096),missingMask=new Uint8Array(size*size),alpha=new Uint8Array(size*size),rgb=new Uint8Array(size*size);
 for(let p=0;p<size*size;p++){const o=p*4,aa=!!a[o+3],bb=!!b[o+3];source+=aa;intersection+=aa&&bb;missing+=aa&&!bb;added+=!aa&&bb;if(!aa&&!bb)continue;union++;alpha[p]=aa;missingMask[p]=aa&&!bb;const tile=Math.floor(p/size/16)*64+Math.floor(p%size/16);
  for(let c=0;c<3;c++){const nominal=Math.abs(linear[a[o+c]]-linear[b[o+c]]),delta=nominal+envelope[p*3+c];nominalError+=nominal;error+=delta;channels++;tiles[tile]+=delta;nominalTiles[tile]+=nominal;counts[tile]++;hist[Math.min(255,Math.ceil(delta*255))]++;if(delta>.03)rgb[p]=1;}}
 let cumulative=0,p99=0;for(let i=0;i<256;i++){cumulative+=hist[i];if(cumulative>=channels*.99){p99=i/255;break;}}
 const out={alphaIoU:intersection/Math.max(union,1),missingPixels:missing,addedPixels:added,missingFraction:missing/Math.max(source,1),addedFraction:added/Math.max(source,1),linearRgbMae:error/Math.max(channels,1),nominalLinearRgbMae:nominalError/Math.max(channels,1),p99Approx:p99,maxTileMae:Math.max(...Array.from(tiles,(v,i)=>counts[i]?v/counts[i]:0)),nominalMaxTileMae:Math.max(...Array.from(nominalTiles,(v,i)=>counts[i]?v/counts[i]:0)),missingRegions:regions(missingMask,size,alpha),rgbOutlierRegions:regions(rgb,size),alphaDistanceGate:alphaDistanceGate(a,b,size)};
 out.passes=out.alphaIoU>=.9995&&out.missingFraction<=.00025&&out.addedFraction<=.0005&&out.alphaDistanceGate.passes&&out.linearRgbMae<=.002&&out.p99Approx<=.015&&out.maxTileMae<=.01&&!out.missingRegions.some(r=>r.pixels>4||r.diameterUpperBound>2)&&!out.rgbOutlierRegions.some(r=>r.pixels>16);return out;
}
async function run(){
 const options=new URLSearchParams(location.search),limit=Number(options.get('limit')??16),bridgeOnly=options.has('bridgeOnly'),sourceNormalPath=options.has('sourceNormalPath'),interleaveReverses=options.has('interleaveReverses');
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setSize(size,size);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.querySelector('#view').append(renderer.domElement);
 const gl=renderer.getContext(),sourceAssets=new Assets(),manifest=await fetch('/content/models.json').then(r=>r.json()),url=manifest.find(m=>m.source.includes('Cultivos')).url;
 const [gltf,data,selection,pairSelection]=await Promise.all([sourceAssets.model(url),fetch('/content/crop-bridges.json').then(r=>r.json()),fetch('/docs/qa/frontside-model-pilot/runtime-visibility-selection.json').then(r=>r.json()),fetch('/docs/qa/frontside-model-pilot/runtime-visibility-crop-pairs-selection.json').then(r=>r.json())]);
 const sourceModels=[];gltf.scene.traverse(mesh=>{if(mesh.isMesh){const meta=mesh.userData;sourceModels[meta.cropIndex*5+meta.stage-1]=mesh;}});
 const scene=new THREE.Scene(),toon=new AfricanToon(),registry=new SceneMaterialRegistry(scene,toon),sky=new NativeSky();await sky.load();toon.environment(sky.environmentTextures,sky.uniforms.uSkyYaw);
 const sun=new THREE.DirectionalLight('#ffe2a8',3),ambient=new THREE.HemisphereLight('#ebf1d9','#765b3b',2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);configureShadowCamera(sun);updateShadowCamera(sun,new THREE.Vector3());scene.add(sun,sun.target,ambient);
 const release=installNativeShadow(renderer,sun,toon.shadowUniforms);release.cache.enabled=false;
 const rigs=[],resourceRows=[],ownedCandidateGeometries=[];
 for(let arm=0;arm<4;arm++){
  const group=new THREE.Group();const batch=createCropBatch(group,renderer,gltf,data,2),speciesBudgets={};let sourceTriangles=0,candidateTriangles=0,bytes=0;
  group.traverse(mesh=>{if(!mesh.isMesh)return;const match=mesh.name.match(/^puente_(.+)_(\d+)_(\d+)$/),originalGeometry=mesh.geometry,originalFaceCount=(originalGeometry.index?.count??originalGeometry.getAttribute('position').count)/3,species=match?match[1]:sourceModels.find(m=>m.name===mesh.name).userData.crop;let changed=false;
   if(match){const source=sourceModels.find(m=>m.userData.crop===match[1]&&m.userData.stage===Number(match[2])),ai=source.userData.cropIndex*5+Number(match[2])-1,bi=ai+1;
    const pair=data.pairs.find(p=>p.a===ai&&p.b===bi),keys=[];for(const [role,model] of [[0,ai],[1,bi]]){const indices=sourceModels[model].geometry.index.array;for(let f=0;f<data.models[model].faces;f++)for(let c=0;c<3;c++)keys.push([role,indices[f*3+c],data.models[model].faceLabels[f]]);}
    sourceTriangles+=keys.length/3;
    if(arm>0){const faces=arm>1?(pairSelection.selected[`bridgeSource/${ai}-${bi}`]??[]).map(s=>{const [m,f]=s.split(':').map(Number);return m===ai?f:data.models[ai].faces+f;}):[];const result=indexBridgeGeometry(mesh.geometry,keys,faces,interleaveReverses&&arm>1);mesh.geometry=result.geometry;changed=faces.length>0;}
   }else{const source=sourceModels.find(m=>m.name===mesh.name),meta=source.userData,index=meta.cropIndex*5+meta.stage-1;sourceTriangles+=mesh.geometry.index.count/3;
    if(arm>1){const faces=new Set(selection.selected[mesh.name]??[]);for(const entry of selection.selected.bridgeSource??[]){const [m,f]=entry.split(':').map(Number);if(m===index)faces.add(f);}if(faces.size){mesh.geometry=reverseIndexedState(mesh.geometry,[...faces].sort((a,b)=>a-b),interleaveReverses);changed=true;}}
   }
   if(arm>1&&changed){const material=mesh.material.clone();material.onBeforeCompile=mesh.material.onBeforeCompile;material.customProgramCacheKey=mesh.material.customProgramCacheKey;material.side=THREE.FrontSide;material.shadowSide=THREE.DoubleSide;if(arm===3)patchReverseDerivativeFrame(material,!!match,sourceNormalPath);mesh.material=material;}
   if(mesh.geometry!==originalGeometry)ownedCandidateGeometries.push(mesh.geometry);
   const candidateFaceCount=(mesh.geometry.index?.count??mesh.geometry.getAttribute('position').count)/3,meshBytes=Object.values(mesh.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(mesh.geometry.index?.array.byteLength??0)+mesh.instanceMatrix.array.byteLength;
   candidateTriangles+=candidateFaceCount;bytes+=meshBytes;const speciesRow=speciesBudgets[species]??={sourceTriangles:0,candidateTriangles:0,geometryAndInstanceBufferBytes:0};speciesRow.sourceTriangles+=originalFaceCount;speciesRow.candidateTriangles+=candidateFaceCount;speciesRow.geometryAndInstanceBufferBytes+=meshBytes;mesh.castShadow=mesh.receiveShadow=true;
  });for(const row of Object.values(speciesBudgets))row.triGrowthPercent=100*(row.candidateTriangles/row.sourceTriangles-1);
  scene.add(group);rigs.push({group,batch});resourceRows.push({arm,sourceTriangles,candidateTriangles,triGrowthPercent:100*(candidateTriangles/sourceTriangles-1),geometryAndInstanceBufferBytes:bytes,speciesBudgets});
 }
 const report={status:'VISUAL_SCREEN_NOT_APPROVED',cropVisual:true,metricPolicyVersion:2,source:url,sourceNormalPath,arms:['original DoubleSide','indexed DoubleSide','selective FrontSide uncompensated',sourceNormalPath?'selective FrontSide source-normal-path':'selective FrontSide XY compensated'],resolution:size,contextAttributes:gl.getContextAttributes(),resources:resourceRows,samples:[],limitations:['Maize pilot only; no category approval or GPU timing.','Color shadows retain DoubleSide; shadowFront/depth/ground masks are separate gates.','Actual source growth/bridge shaders and web textures; indexed source isolates indexing from culling.','Candidate resource gates remain unchanged; rendered quality cannot waive triangle budget.']};
 report.interleaveReverses=interleaveReverses;
 const transitionWidth=Math.min(.34,2/(.25*cropSpec('maiz').growth_seconds)),bridgeGrowths=[.25,.5,.75].map(t=>.53+.25*(.81-transitionWidth*.5+transitionWidth*t));
 const camera=new THREE.PerspectiveCamera(35,1,.01,100),pixels=Array.from({length:4},()=>new Uint8Array(size*size*4)),growths=bridgeOnly?bridgeGrowths:[1,...bridgeGrowths,.065,.27,.53,.78];let stop=false;
 campaign:for(const growth of growths)for(const clock of [1.75,4.125])for(const biome of ['sabana','manglares'])for(const night of [0,.5,1])for(const elevation of [32.5,62.5])for(const azimuth of [26.25,116.25,206.25,296.25]){
  if(cancelled)throw Error('Cancelled');for(const rig of rigs)rig.batch.update([{id:'1',species:'maiz',x:0,z:0,growth:growth*cropSpec('maiz').growth_seconds}],clock,()=>0);sun.intensity=3-2.6*night;ambient.intensity=2-.9*night;toon.update(night,sun,biome);registry.update(clock);
  const height=rigs[0].batch.sample('maiz',growth*cropSpec('maiz').growth_seconds).height,center=new THREE.Vector3(0,height*.5,0),a=azimuth*Math.PI/180,e=elevation*Math.PI/180;camera.position.copy(center).add(new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(Math.max(.65,height*.7)*3));camera.lookAt(center);camera.updateMatrixWorld();
  const envelope=new Float64Array(size*size*3),controls=[];let alphaChanges=0;
  for(let arm=0;arm<4;arm++){rigs.forEach((r,i)=>r.group.visible=i===arm);renderer.render(scene,camera);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,pixels[arm]);if(arm===0){for(let j=0;j<3;j++){const repeat=new Uint8Array(pixels[0].length);renderer.render(scene,camera);gl.readPixels(0,0,size,size,gl.RGBA,gl.UNSIGNED_BYTE,repeat);const metric=accumulateControlEnvelope(envelope,pixels[0],repeat,linear);controls.push(metric);alphaChanges+=metric.alphaDifferences;}const control=controlEnvelopeMetrics(envelope,pixels[0],size);if(alphaChanges||!control.passes){report.invalidControl={growth,clock,biome,night,elevation,azimuth,controls,control};stop=true;break;}}}
  if(stop)break campaign;
  const comparisons=[1,2,3].map(arm=>({arm,...colorMetrics(pixels[0],pixels[arm],envelope)}));report.samples.push({growth,clock,biome,night,elevation,azimuth,controls,comparisons,phase:rigs[0].batch.sample('maiz',growth*cropSpec('maiz').growth_seconds).phase});status.textContent=`${report.samples.length} vistas: indexed=${comparisons[0].passes}, sinXY=${comparisons[1].passes}, conXY=${comparisons[2].passes}`;
  if(!comparisons[0].passes||!comparisons[2].passes||report.samples.length>=limit)break campaign;await new Promise(requestAnimationFrame);
 }
 if(report.samples.length&&!report.invalidControl){const canvas=document.createElement('canvas');canvas.width=size*4;canvas.height=size;const ctx=canvas.getContext('2d');for(let arm=0;arm<4;arm++){const image=ctx.createImageData(size,size);for(let y=0;y<size;y++)image.data.set(pixels[arm].subarray((size-1-y)*size*4,(size-y)*size*4),y*size*4);ctx.putImageData(image,arm*size,0);}report.capturePng=canvas.toDataURL('image/png');
  if(options.has('mapRgb')){report.rgbFaceProvenance=[];for(const arm of [0,3]){rigs.forEach((r,i)=>r.group.visible=i===arm);report.rgbFaceProvenance.push({arm,faces:mapColorProvenance(renderer,rigs[arm].group,scene,camera,pixels[0],pixels[3],size)});}}
 }
 await fetch('/__frontside_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});release();registry.dispose();for(const geo of ownedCandidateGeometries)geo.dispose();for(const r of rigs)r.batch.dispose();sourceAssets.disposeModels();renderer.dispose();renderer.forceContextLoss();status.textContent+='\nInforme guardado, GPU liberada. NOT APPROVED.';
}

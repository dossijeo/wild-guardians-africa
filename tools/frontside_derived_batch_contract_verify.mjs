// Offline native batch/driver contract, not rendered texture/shader quality.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCropBatch} from '../src/rendering/crop-batch.js';
import {cropSpec} from '../src/simulation/rules.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {derivedStemGeometry,derivedSoilGeometry} from './lib/frontside-derived-stem.mjs';
import {partitionCropGeometry} from './lib/frontside-crop-partition.mjs';
const soil=process.argv.includes('--soil'),anchorNormals=process.argv.includes('--anchor-normals');if(soil&&anchorNormals)throw Error('One candidate only');
const folder='docs/qa/frontside-model-pilot/',receipt=JSON.parse(await readFile(folder+(soil?'maize-soil-budget-high-interior-diagnostic.json':anchorNormals?'maize-stem-anchor-normal-restoration-diagnostic.json':'maize-blender-stem-budget-max-diagnostic.json'),'utf8')),row=soil||anchorNormals?receipt:receipt.rows[0],sha=b=>createHash('sha256').update(b).digest('hex'),bytes=await readFile(row.archive);
if(sha(bytes)!==row.archiveSha256)throw Error('Derived archive hash mismatch');
const payload=JSON.parse(bytes),sourceReceipt=JSON.parse(await readFile(folder+'selective-candidate-receipts.json','utf8')).find(r=>r.category==='crops'),raw=await readFile('public'+sourceReceipt.source);
if(sha(raw)!==receipt.sourceSha256||payload.sourceSha256!==receipt.sourceSha256)throw Error('Source asset hash mismatch');
const {json,bin}=readGlb(raw);
function strip(o){if(!o||typeof o!=='object')return;for(const k of Object.keys(o))if(k.endsWith('Texture'))delete o[k];else strip(o[k]);}strip(json.materials);delete json.images;delete json.textures;
const gltf=await new GLTFLoader().parseAsync(writeGlb(json,bin).buffer,''),bridge=JSON.parse(await readFile('public/content/crop-bridges.json','utf8')),sourceNode=gltf.scene.getObjectByName(payload.mesh),labels=bridge.models[sourceNode.userData.cropIndex*5+sourceNode.userData.stage-1].faceLabels;
const groups=[new THREE.Group(),new THREE.Group()],renderer={capabilities:{getMaxAnisotropy:()=>8}},batches=groups.map(g=>createCropBatch(g,renderer,gltf,bridge,2)),meshes=groups.map(g=>g.getObjectByName(payload.mesh)),candidate=meshes[1],oldGeometry=candidate.geometry,oldInstance=candidate.instanceMatrix,oldGrowth=oldGeometry.getAttribute('iGrowth');
candidate.geometry=(soil?derivedSoilGeometry:derivedStemGeometry)(oldGeometry,labels,payload).geometry;
if(candidate.instanceMatrix!==oldInstance||candidate.geometry.getAttribute('iGrowth')!==oldGrowth)throw Error('Live instance driver objects were replaced');
const results=[];
for(const growth of [.865,.92,.98,1])for(const clock of [1.75,4.125]){
 for(const batch of batches)batch.update([{id:'1',species:'maiz',x:0,z:0,growth:growth*cropSpec('maiz').growth_seconds}],clock,()=>0);
 const hashes=meshes.map(m=>({count:m.count,iGrowth:sha(new Uint8Array(m.geometry.getAttribute('iGrowth').array.buffer)),instanceMatrix:sha(new Uint8Array(m.instanceMatrix.array.buffer))}));
 if(JSON.stringify(hashes[0])!==JSON.stringify(hashes[1]))throw Error('Original/derived live instance values differ');
 const shaders=meshes.map(m=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.material.onBeforeCompile(shader,renderer);return shader;});
 const uniforms=shaders.map(s=>Object.fromEntries(Object.entries(s.uniforms).map(([name,u])=>[name,u.value])));
 if(JSON.stringify(uniforms[0])!==JSON.stringify(uniforms[1])||shaders[0].vertexShader!==shaders[1].vertexShader||shaders[0].fragmentShader!==shaders[1].fragmentShader)throw Error('Native growth recipe differs');
 results.push({growth,clock,activeMatureMesh:meshes[0].count>0,liveInstanceEqual:true,growthUniforms:uniforms[0],growthHooksEqual:true,phase:batches[0].sample('maiz',growth*cropSpec('maiz').growth_seconds).phase});
}
const full=soil?partitionCropGeometry(candidate.geometry,payload.faceLabels,[1],payload.faceLabels.flatMap((label,face)=>label===1?[face]:[])).geometry:derivedStemGeometry(oldGeometry,labels,payload,true).geometry,fullBytes=Object.entries(full.attributes).filter(([name])=>name!=='iGrowth').reduce((n,[,a])=>n+a.array.byteLength,0)+full.index.array.byteLength;
if(full.index.count/3!==(soil?row.prospectiveBilateralTriangles:row.proposedBilateralTriangles)||fullBytes!==(soil?row.prospectiveStateBytes:row.proposedSharedStateBytes))throw Error('Bilateral native state receipt mismatch');
const report={status:'OFFLINE_DERIVED_BATCH_CONTRACT_ONLY_NOT_APPROVED',sourceSha256:receipt.sourceSha256,archiveSha256:row.archiveSha256,unchangedOriginalFaces:(soil?payload.originalFixedFaceIds:payload.originalUnchangedFaceIds).length,liveInstanceObjectsPreserved:true,bilateralTriangles:full.index.count/3,sharedStateBytesWithoutInstanceDrivers:fullBytes,results,limitations:['Original lossless geometry/native createCropBatch executed; textures stripped for Node-only loading and not rendered.', 'Growth hook comparison omits actual AfricanToon/GL macros, sampler contents, TBN/interpolation, shader evaluation and visual/shadow/GPU gates.', 'One mature native state only; source bridge geometries retain original topology, not a completed adapted bridge.', 'Any inactive mature mesh sample does not validate derived mesh coverage; no view masks or heldout poses used.', 'Prior rejected proposals remain rejected; this is not a quality claim.']};
if(anchorNormals){report.normalFieldMethod=payload.normalFieldMethod;report.limitations.push('Restored normals apply only to unique exact P/UV anchors; unchanged658 geometry is already rejected in native DoubleSide training. No repair of that rejection is demonstrated.');}
if(soil){report.soilOnly=true;const bad=structuredClone(payload);bad.corners[0][0][6]+=.125;let rejected=false;try{derivedSoilGeometry(oldGeometry,labels,bad);}catch{rejected=true;}if(!rejected)throw Error('Changed retained stem/leaf UV was accepted');report.modifiedRetainedUvRejected=true;}
await import('node:fs/promises').then(fs=>fs.writeFile(folder+(soil?'maize-soil-budget-batch-contract.json':anchorNormals?'maize-stem-anchor-normal-batch-contract.json':'maize-stem-budget-max-batch-contract.json'),JSON.stringify(report,null,2)+'\n'));
console.log(JSON.stringify({status:report.status,results:results.length,activeMatureResults:results.filter(r=>r.activeMatureMesh).length,bilateralTriangles:report.bilateralTriangles,sharedStateBytes:fullBytes,liveInstanceObjectsPreserved:true}));

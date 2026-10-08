// Actual CPU source batch and controlled derivative; no renderer or textures.
import fs from 'node:fs';import crypto from 'node:crypto';import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {createCropBatch} from '../src/rendering/crop-batch.js';
import {cropSpec} from '../src/simulation/rules.js';
import {sharedLeafReviewCases} from './lib/frontside-shared-leaf-review-cases.mjs';
import {sharedLeafReverseGeometry} from './lib/frontside-shared-leaf-reverse.mjs';
const folder='docs/qa/frontside-model-pilot/',receipt=JSON.parse(fs.readFileSync(folder+'maize-blender-leaf-reduction-diagnostic.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),raw=fs.readFileSync('public/assets/'+receipt.sourceSha256+'.glb'),archive=fs.readFileSync(receipt.archive),bridgeRaw=fs.readFileSync('public/content/crop-bridges.json');
if(sha(raw)!==receipt.sourceSha256||sha(archive)!==receipt.archiveSha256)throw Error('Immutable source identity mismatch');
const {json,bin}=readGlb(raw);function omitTextures(o){if(!o||typeof o!=='object')return;for(const key of Object.keys(o))if(key.endsWith('Texture'))delete o[key];else omitTextures(o[key]);}
omitTextures(json.materials);delete json.images;delete json.textures;
const gltf=await new GLTFLoader().parseAsync(writeGlb(json,bin).buffer,''),group=new THREE.Group(),batch=createCropBatch(group,{capabilities:{getMaxAnisotropy:()=>1}},gltf,JSON.parse(bridgeRaw),2),target=group.getObjectByName(receipt.mesh),original=target.geometry,payload=JSON.parse(archive),derived=sharedLeafReverseGeometry(original,payload);
target.geometry=derived.geometry;const rows=[];
try{for(const sample of sharedLeafReviewCases){const seconds=sample.growth*cropSpec('maiz').growth_seconds;batch.update([{id:'1',species:'maiz',x:0,z:0,growth:seconds}],sample.clock,()=>0);const state=batch.sample('maiz',seconds),active=[];group.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.visible&&mesh.count>0)active.push({name:mesh.name,instances:mesh.count,indexCount:mesh.geometry.index?.count??null});});const matureActive=target.visible&&target.count>0;if(state.phase!==sample.expectedPhase||matureActive!==sample.expectedMatureActive)throw Error('Phase contract mismatch: '+sample.id);rows.push({id:sample.id,growth:sample.growth,phase:state.phase,stage:state.stage,matureActive,active,liveGrowthShared:target.geometry.getAttribute('iGrowth')===original.getAttribute('iGrowth')});}}
finally{target.geometry=original;derived.geometry.dispose();batch.dispose();}
const report={status:'CPU_PHASE_CONTRACT_PASS_NOT_VISUAL_OR_GPU_APPROVAL',sourceSha256:sha(raw),archiveSha256:sha(archive),bridgeSha256:sha(bridgeRaw),cropBatchSha256:sha(fs.readFileSync('src/rendering/crop-batch.js')),casesSha256:sha(fs.readFileSync('tools/lib/frontside-shared-leaf-review-cases.mjs')),rows,limitations:['Texture references omitted only from the temporary in-memory loader; original files unchanged. No shader compilation or GPU draw.','Bridge geometry remains original. Bridge-only cases do not establish active derivative coverage or continuity of the changed mature leaf topology.','Prospective camera cases are fixed before native captures. Appearance and transition continuity need inspection; no automatic pixel rejection.']};fs.writeFileSync(folder+'maize-leaf-shared-phase-contract.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

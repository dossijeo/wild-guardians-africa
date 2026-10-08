// CPU training-view guidance only. No GPU draw, maps, pixel coverage or acceptance.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {sampleFixedPose} from '../src/rendering/fixed-pose.js';
import {syncWorkerToolVisibility} from '../src/rendering/worker-tool-visibility.js';
const folder='docs/qa/frontside-model-pilot/',library=JSON.parse(await readFile('public/content/worker-actions.json','utf8')).youngMale;
const raw=await readFile('public'+library.url);
if(createHash('sha256').update(raw).digest('hex')!==library.sha256)throw Error('Source hash mismatch');
const {json,bin}=readGlb(raw),diagnostic=JSON.parse(await readFile(folder+'worker-zero-normal-diagnostics.json','utf8'));
if(diagnostic.sourceSha256!==library.sha256)throw Error('Normal diagnostic source mismatch');
// Textures are omitted in this in-memory CPU clone only, avoiding DOM/image loads.
// Positions/indices/rig/animations/material side stay original; no export is saved.
function omitTextures(o){if(!o||typeof o!=='object')return;for(const key of Object.keys(o)){if(key.endsWith('Texture'))delete o[key];else omitTextures(o[key]);}}
omitTextures(json.materials);delete json.images;delete json.textures;
const bytes=writeGlb(json,bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
const model=gltf.scene,data={model,mixer:new THREE.AnimationMixer(model),action:null},target=model.getObjectByName('Can_badge_geometry_5');
if(!target?.isMesh||target.isSkinnedMesh)throw Error('Expected rigid Badge5 accessory');
const rows=[];
for(const clip of gltf.animations)for(const fraction of [0,.25,.5,.75,.90625]){
 data.action?.stop();data.action=data.mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();data.action.paused=true;data.action.clampWhenFinished=true;
 sampleFixedPose(data,clip.duration*fraction,true);model.updateMatrixWorld(true);
 const M=new THREE.Matrix3().getNormalMatrix(target.matrixWorld),gram=M.clone().transpose().multiply(M),g=gram.elements,scale=(g[0]+g[4]+g[8])/3;
 rows.push({clip:clip.name,fraction,normalMatrix:M.elements,normalizedGram:g.map(x=>x/scale),columnLengthRatio:Math.sqrt(Math.max(g[0],g[4],g[8])/Math.min(g[0],g[4],g[8]))});
}
const reference=rows[0].normalizedGram;
const report={status:'CPU_NORMAL_TRANSFORM_DIAGNOSTIC_NOT_APPROVED',sourceSha256:library.sha256,mesh:target.name,rows,maxNormalizedGramPoseDeviation:Math.max(...rows.map(r=>Math.max(...r.normalizedGram.map((v,i)=>Math.abs(v-reference[i]))))),limitations:['CPU raw source rig with textures omitted only in memory, no shader/draw or visual acceptance.', 'Camera view rotation cancels from M transpose M. Normals are normalized per vertex by Three before interpolation; local-frame chord error does not bound anisotropic transformed interpolation.', 'Runtime adapters and exact native shader/output still require inspection.']};
await writeFile(folder+'worker-badge-normal-transform-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ratioRange:[Math.min(...rows.map(r=>r.columnLengthRatio)),Math.max(...rows.map(r=>r.columnLengthRatio))],maxNormalizedGramPoseDeviation:report.maxNormalizedGramPoseDeviation,water:rows.find(r=>r.clip==='Water'&&r.fraction===.90625)}));

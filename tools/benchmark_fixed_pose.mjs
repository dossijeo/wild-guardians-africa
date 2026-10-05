// CPU comparison using native geometry/skins/tracks; Node omits textures only.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {AnimationMixer,Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {applyWorkerPose} from '../src/rendering/worker-actions.js';
import {applyAnimalPose,prepareAnimalClips,prepareAnimalModel,animalGroundSamples} from '../src/rendering/animal-actions.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const output=process.argv[2];if(!output||process.argv.length!==3)throw Error('Usage: node tools/benchmark_fixed_pose.mjs OUTPUT.json');
const workers=JSON.parse(await readFile('public/content/worker-actions.json','utf8'));
async function baseline(name){const url=new URL('../src/rendering/'+name,import.meta.url);let source=await readFile(url,'utf8');source=source.replace("import {sampleFixedPose} from './fixed-pose.js';\n",'').replace('sampleFixedPose(data,pose.time,restart);','data.action.time=pose.time;data.mixer.update(0);');source=source.replace(/from (['"])([^'"]+)\1/g,(_,q,p)=>'from '+q+(p.startsWith('.')?new URL(p,url).href:import.meta.resolve(p))+q);return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));}
const oldWorker=(await baseline('worker-actions.js')).applyWorkerPose,oldAnimal=(await baseline('animal-actions.js')).applyAnimalPose;
function geometryOnly(bytes){const size=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+size));for(const m of doc.materials??[]){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=bytes.subarray(20+size),out=Buffer.alloc(20+length+bin.length,32);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);json.copy(out,20);bin.copy(out,20+length);return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);}
const records=[];
for(const [type,libraries] of [['worker',workers],['animal',ANIMAL_ACTIONS.animals]])for(const [id,library] of Object.entries(libraries)){
 const bytes=await readFile('public'+library.url),gltf=await new GLTFLoader().parseAsync(geometryOnly(bytes),'');
 function rig(){const model=clone(gltf.scene),parent=new Group();parent.position.set(20,5,10);parent.add(model);if(type==='animal')prepareAnimalModel(model,id);const data={model,mixer:new AnimationMixer(model),clips:type==='animal'?prepareAnimalClips(gltf.animations):gltf.animations,groundSamples:type==='animal'?animalGroundSamples(model):null};let evaluations=0;const update=data.mixer.update.bind(data.mixer);data.mixer.update=t=>{evaluations++;return update(t);};return {data,parent,evaluations:()=>evaluations};}
 const candidate=rig(),reference=rig();
 function call(r,optimized,frame){if(type==='worker'){const w={profile:id,...frame.worker};(optimized?applyWorkerPose:oldWorker)(r.data,w,frame.task??null,frame.elapsed,library);}else{const a={species:id,...frame.animal};(optimized?applyAnimalPose:oldAnimal)(r.data,a,frame.elapsed);}}
 const attack=Object.keys(library.clips??{}).find(n=>n!=='Walking'&&n!=='Running'),duration=library.clips?.[attack]?.duration;
 const frames=type==='worker'?[{worker:{status:'idle'},elapsed:1},{worker:{status:'walking',walkPhase:.5},elapsed:2},{worker:{status:'acting',actionRemaining:1.5},task:{kind:'water'},elapsed:3},{worker:{status:'carrying',carryPhase:.8},elapsed:4},{worker:{status:'fleeing',fallRemaining:1},elapsed:5}]:[{animal:{status:'approaching',motionPhase:.5},elapsed:1},{animal:{status:'entering',motionPhase:.8},elapsed:2},{animal:{status:'attacking',animation:attack,attackId:'first',attackDuration:duration,attackRemaining:duration*.6},elapsed:3},{animal:{status:'attacking',animation:attack,attackId:'second',attackDuration:duration,attackRemaining:duration*.6},elapsed:3},{animal:{status:'retreating',motionPhase:1.2},elapsed:4}];
 function matrices(r){r.parent.updateMatrixWorld(true);const values=[];r.data.model.traverse(o=>{values.push(...o.matrixWorld.elements);if(o.isSkinnedMesh){o.skeleton.update();values.push(...o.skeleton.boneMatrices);}});return values;}
 let maxError=0;
 for(const frame of frames)for(let repeat=0;repeat<12;repeat++){
  if(repeat===6){candidate.parent.position.x+=17;reference.parent.position.x+=17;candidate.parent.rotation.y+=.4;reference.parent.rotation.y+=.4;}
  call(reference,false,frame);call(candidate,true,frame);const a=matrices(reference),b=matrices(candidate);assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)maxError=Math.max(maxError,Math.abs(a[i]-b[i]));assert.ok(maxError<1e-9,id+' changed pose');
 }
 const verification={maximumMatrixError:maxError,referenceEvaluations:reference.evaluations(),candidateEvaluations:candidate.evaluations(),samples:frames.length*12};
 const summarize=v=>({mean:v.reduce((a,b)=>a+b,0)/v.length,p95:[...v].sort((a,b)=>a-b)[Math.floor(v.length*.95)]});
 const timings=[];
 for(const mode of ['static','changing']){
  const groups=[];
  for(const optimized of [false,true,true,false]){
   const r=rig(),ms=[];for(let i=0;i<240;i++){const frame=type==='worker'?{worker:{status:'walking',walkPhase:mode==='static'?.5:i*.013},elapsed:1}:{animal:{status:'approaching',motionPhase:mode==='static'?.5:i*.013},elapsed:1};const start=performance.now();call(r,optimized,frame);if(i>=40)ms.push(performance.now()-start);}groups.push({optimized,...summarize(ms)});
  }
  timings.push({mode,groups});
 }
 records.push({type,id,source:library.url,sourceSha256:createHash('sha256').update(bytes).digest('hex'),verification,timings});console.log(JSON.stringify({type,id,...verification}));
}
const sources=['src/rendering/fixed-pose.js','src/rendering/worker-actions.js','src/rendering/animal-actions.js','tools/benchmark_fixed_pose.mjs'];
const report={scope:'Node CPU only: four native worker rigs and five native beast rigs, unchanged geometry/skins/tracks. Images omitted. Exact action changes, repeated samples and parent translation/yaw are compared against unconditional mixer evaluation. Grounding still evaluated. No GPU/FPS/mobile claim.',pattern:'ABBA, 40 warmup + 200 measured calls per group and rig, static and changing timestamps',sourceHashes:Object.fromEntries(await Promise.all(sources.map(async name=>[name,createHash('sha256').update(await readFile(name)).digest('hex')]))),records};await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');

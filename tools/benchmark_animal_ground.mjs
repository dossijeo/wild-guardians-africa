// Compare native skins/animation tracks against the pre-composition grounding.
// Node omits image decoding. This measures actor CPU, never GPU or frame rate.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {AnimationMixer,Group,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {applyAnimalPose,prepareAnimalClips,prepareAnimalModel,animalGroundSamples} from '../src/rendering/animal-actions.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const output=process.argv[2];if(!output||process.argv.length!==3)throw Error('Usage: node tools/benchmark_animal_ground.mjs OUTPUT.json');
const base='03eaef6',sourceUrl=new URL('../src/rendering/animal-actions.js',import.meta.url);
const oldSource=execFileSync('git',['show',`${base}:src/rendering/animal-actions.js`],{encoding:'utf8'});
const resolved=oldSource.replace(/from (['"])([^'"]+)\1/g,(_,q,path)=>'from '+q+(path.startsWith('.')?new URL(path,sourceUrl).href:import.meta.resolve(path))+q);
const referenceApply=(await import('data:text/javascript;base64,'+Buffer.from(resolved).toString('base64'))).applyAnimalPose;
function geometryOnly(bytes){
 const size=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+size));
 for(const material of doc.materials??[]){delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;}
 const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=bytes.subarray(20+size),out=Buffer.alloc(20+length+bin.length,32);
 bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);json.copy(out,20);bin.copy(out,20+length);return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
const records=[];
for(const [species,library] of Object.entries(ANIMAL_ACTIONS.animals)){
 const bytes=await readFile('public'+library.url),gltf=await new GLTFLoader().parseAsync(geometryOnly(bytes),'');
 function rig(){const model=clone(gltf.scene),parent=new Group();parent.position.set(4800,5,-7200);parent.rotation.y=.7;parent.add(model);prepareAnimalModel(model,species);return {parent,data:{model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(gltf.animations),groundSamples:animalGroundSamples(model)}};}
 const before=rig(),after=rig();
 function call(r,optimized,phase){return (optimized?applyAnimalPose:referenceApply)(r.data,{species,status:'entering',motionPhase:phase},1);}
 function matrices(r){r.parent.updateMatrixWorld(true);const values=[];r.data.model.traverse(mesh=>{values.push(...mesh.matrixWorld.elements);if(mesh.isSkinnedMesh){mesh.skeleton.update();values.push(...mesh.skeleton.boneMatrices);}});return values;}
 let maximumMatrixError=0;
 for(let frame=0;frame<40;frame++){
  call(before,false,frame*.013);call(after,true,frame*.013);const a=matrices(before),b=matrices(after);
  assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)maximumMatrixError=Math.max(maximumMatrixError,Math.abs(a[i]-b[i]));
 }
 assert.ok(maximumMatrixError<1e-9,`${species}: changed skeleton/world matrices`);
 function transformCalls(r,optimized){
  let count=0;const original=Vector3.prototype.applyMatrix4;
  Vector3.prototype.applyMatrix4=function(matrix){count++;return original.call(this,matrix);};
  try{call(r,optimized,39*.013);}finally{Vector3.prototype.applyMatrix4=original;}return count;
 }
 const referenceTransformCalls=transformCalls(before,false),candidateTransformCalls=transformCalls(after,true);
 assert.equal(referenceTransformCalls-candidateTransformCalls,2*after.data.groundSamples.length,'both full transforms per foot sample must be replaced by a height-only row');
 const timings=[];
 for(const mode of ['static','changing']){
  const groups=[];
  for(const optimized of [false,true,true,false]){
   const r=rig(),samples=[];
   for(let frame=0;frame<160;frame++){
    const start=performance.now();call(r,optimized,mode==='static'?.5:frame*.013);
    if(frame>=40)samples.push(performance.now()-start);
   }
   const ordered=[...samples].sort((a,b)=>a-b);
   groups.push({optimized,mean:samples.reduce((a,b)=>a+b,0)/samples.length,median:ordered[Math.floor(ordered.length*.5)],p95:ordered[Math.floor(ordered.length*.95)]});
  }
  timings.push({mode,groups});
 }
 records.push({species,groundSamples:after.data.groundSamples.length,referenceTransformCalls,candidateTransformCalls,maximumMatrixError,sourceSha256:createHash('sha256').update(bytes).digest('hex'),timings});
 console.log(JSON.stringify({species,maximumMatrixError,referenceTransformCalls,candidateTransformCalls}));
}
const files=['src/rendering/animal-actions.js','src/rendering/fixed-pose.js','tools/benchmark_animal_ground.mjs'];
const report={baseline:base,scope:'Node CPU only, original five GLBs with native skins/tracks; textures omitted. Background campaigns and child test suite may affect timing. No integrated GPU/FPS/mobile/RAM claim.',pattern:'ABBA, 40 warmup +120 measured calls/group, static and changing poses',sourceHashes:Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),records};
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');

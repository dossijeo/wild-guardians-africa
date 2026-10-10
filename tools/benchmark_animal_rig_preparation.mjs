// CPU-only attribution of the real initial spare-rig path. No browser/GPU claims.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimalPreload,releaseActorRig} from '../src/rendering/animal-preload.js';
import {prepareAnimalClips} from '../src/rendering/animal-actions.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';

const output=process.argv[2];
if(!output||process.argv.length!==3)throw Error('Usage: node tools/benchmark_animal_rig_preparation.mjs OUTPUT.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function geometryOnly(bytes){
 const size=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+size));
 for(const material of doc.materials??[]){
  delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;
  delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
 }
 const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=bytes.subarray(20+size),out=Buffer.alloc(20+length+bin.length,32);
 bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);json.copy(out,20);bin.copy(out,20+length);
 return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
const records=[];
for(const [species,descriptor] of Object.entries(ANIMAL_ACTIONS.animals)){
 const bytes=await readFile('public'+descriptor.url),start=performance.now();
 const gltf=await new GLTFLoader().parseAsync(geometryOnly(bytes),'');
 const geometryParseMs=performance.now()-start;
 const pool=new AnimalPreload(null,null),samples=[];
 let vertices=0,skins=0;gltf.scene.traverse(mesh=>{if(mesh.isSkinnedMesh){skins++;vertices+=mesh.geometry.attributes.position.count;}});
 for(let repetition=0;repetition<8;repetition++){
  const clipStart=performance.now(),clips=prepareAnimalClips(gltf.animations),clipMs=performance.now()-clipStart;
  const rigStart=performance.now(),rig=pool.create(species,{gltf,clips}),rigMs=performance.now()-rigStart;
  samples.push({repetition,clipMs,rigMs,groundSamples:rig.groundSamples.length,boundActions:clips.length});
  releaseActorRig(rig);
 }
 pool.dispose();
 gltf.scene.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();for(const material of [mesh.material].flat())material.dispose();}if(mesh.isSkinnedMesh)mesh.skeleton.dispose();});
 records.push({species,url:descriptor.url,assetSha256:hash(bytes),skins,vertices,geometryParseMs,samples});
 console.log(JSON.stringify({species,geometryParseMs,maxRigMs:Math.max(...samples.map(s=>s.rigMs))}));
}
const sources={};
for(const path of ['src/rendering/animal-preload.js','src/rendering/animal-actions.js','src/rendering/skin-envelope.js','src/rendering/fixed-pose.js','tools/benchmark_animal_rig_preparation.mjs'])sources[path]=hash(await readFile(path));
const report={schema:'wg-animal-rig-cpu-attribution/1',source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,platform:process.platform,sources,scope:'Node CPU diagnostic of original authored geometry, skinning and clips. Material texture references removed solely to avoid browser image decoding. No downloads, image decode, compressed-GLB decode, uploads, rendering, GPU or WARP timing. Eight repetitions include first-use/JIT effects; not an end-to-end loading comparison.',records};
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');

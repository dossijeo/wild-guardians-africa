import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {geometryOnly} from './calibrate_footsteps.mjs';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {prepareSkinEnvelope} from '../src/rendering/skin-envelope.js';

const [baselinePath,output]=process.argv.slice(2);
if(!baselinePath||!output)throw Error('Usage: node tools/check_skin_preparation.mjs BASELINE_MODULE OUTPUT.json');
const baseline=await import(pathToFileURL(resolve(baselinePath)).href);
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync('content/manifests/web-assets.json')),records=[];
const snapshot=e=>({boxes:e.boxes.map(b=>[b.min.toArray(),b.max.toArray()]),minSum:e.minSum,maxSum:e.maxSum,
 groups:e.groups.map(g=>({minSum:g.minSum,maxSum:g.maxSum,terms:g.map(t=>({bone:t.bone,lo:t.lo,hi:t.hi}))}))});
for(const [species,library] of Object.entries(ANIMAL_ACTIONS.animals)){
 const record=manifest.records.find(r=>'/'+r.source===library.url);assert.ok(record);
 const bytes=readFileSync('public/'+record.runtime);assert.equal(hash(bytes),record.runtimeSha256);
 const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(geometryOnly(bytes),'');
 const meshes=[];gltf.scene.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});assert.ok(meshes.length);
 const timings={baseline:[],candidate:[]};let comparisons=0;
 // Separate attribute/geometry identities force cold preparation in both
 // helpers. Allocation/cloning is outside the timed interval. Alternate order.
 for(let pair=0;pair<8;pair++){
  const snapshots={};
  for(const mode of pair%2?['candidate','baseline']:['baseline','candidate']){
   const copies=meshes.map(m=>{const copy=m.clone();copy.geometry=m.geometry.clone();return copy;});
   const start=performance.now(),envelopes=copies.map(mode==='baseline'?baseline.prepareSkinEnvelope:prepareSkinEnvelope);
   const elapsed=performance.now()-start;assert.ok(envelopes.every(Boolean));
   snapshots[mode]=envelopes.map(snapshot);if(pair>=2)timings[mode].push(elapsed);
   copies.forEach(m=>m.geometry.dispose());
  }
  assert.deepEqual(snapshots.candidate,snapshots.baseline);comparisons++;
 }
 const summarize=a=>{const sorted=[...a].sort((a,b)=>a-b);return {median:sorted[Math.floor(sorted.length/2)],max:sorted.at(-1),samples:a};};
 const row={species,sha256:hash(bytes),comparisons,timings:Object.fromEntries(Object.entries(timings).map(([k,a])=>[k,summarize(a)]))};
 records.push(row);console.log(JSON.stringify(row));
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({scope:'Alternating Node cold preparation only; equal envelope data. Geometry cloning outside timing. Not browser/GPU/mobile or total load time.',
 sourceHashes:{baseline:hash(readFileSync(baselinePath)),candidate:hash(readFileSync('src/rendering/skin-envelope.js')),tool:hash(readFileSync('tools/check_skin_preparation.mjs'))},records},null,2)+'\n');

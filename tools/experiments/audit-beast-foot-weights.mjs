import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {readGlb} from '../glb-container.mjs';
const baseline='ead3780fa',species=process.argv[2]??'lion';
const previous=JSON.parse(execFileSync('git',['show',`${baseline}:content/manifests/animal-actions.json`],{encoding:'utf8'})).animals[species];
const current=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species];
const before=readGlb(execFileSync('git',['show',`${baseline}:public${previous.url}`],{maxBuffer:100*1024*1024}));
const after=readGlb(await readFile('public'+current.url));
const metadata=after.json.asset.extras.wildFootWeights;
assert(metadata);delete after.json.asset.extras.wildFootWeights;
if(!before.json.asset.extras&&Object.keys(after.json.asset.extras).length===0)delete after.json.asset.extras;
assert.deepEqual(after.json,before.json,'Only foot provenance may change in GLTF JSON');
assert.equal(after.bin.length,before.bin.length);
const allowed=new Uint8Array(before.bin.length);
for(const mesh of before.json.meshes)for(const p of mesh.primitives){
 const a=before.json.accessors[p.attributes.WEIGHTS_0];if(!a)continue;
 assert.equal(a.componentType,5126);const b=before.json.bufferViews[a.bufferView];assert(!b.byteStride);
 const start=(b.byteOffset??0)+(a.byteOffset??0);allowed.fill(1,start,start+a.count*16);
 const view=new DataView(after.bin.buffer,after.bin.byteOffset,after.bin.byteLength);
 for(let i=0;i<a.count;i++){let sum=0;for(let k=0;k<4;k++){const w=view.getFloat32(start+i*16+k*4,true);assert(w>=0&&w<=1);sum+=w;}assert(Math.abs(sum-1)<1e-5);}
}
let changedBytes=0;
for(let i=0;i<allowed.length;i++)if(before.bin[i]!==after.bin[i]){assert(allowed[i],`Unexpected change at ${i}`);changedBytes++;}
assert(changedBytes>0);
assert.equal(current.presentation.scale,previous.presentation.scale);
const report={species,baseline,before:previous.url,after:current.url,changedBytes,metadata,
 invariants:'All JSON except provenance identical; every changed BIN byte belongs to WEIGHTS_0. Positions, indices, normals, UVs, textures, joints, inverse bind matrices, animations and presentation scale unchanged. All weights normalized.'};
await writeFile(`docs/qa/beast-integration-20261025/${species}/foot-weight-invariants.json`,JSON.stringify(report,null,2)+'\n');
console.log(species,'PASS',changedBytes);

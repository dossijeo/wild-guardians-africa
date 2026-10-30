import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {readGlb} from '../tools/glb-container.mjs';

test('real expressive worker: normal repair preserves every non-normal accessor and original images',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'wg-normal-frames-'));
 const source='public/assets/4c3d590d278e3fc979257b71502ed8b151e5821972e192c19f0228004d70d141.glb',edited='content/source/actors/olderFemale/expressive-candidate.glb';
 const repaired=path.join(directory,'repaired.glb'),output=path.join(directory,'output.glb');
 execFileSync(process.execPath,['tools/guardian/experiment_worker_normal_seams.mjs',repaired]);
 execFileSync(process.execPath,['tools/guardian/transfer_normal_frame_corrections.mjs',source,repaired,edited,output]);
 const before=readGlb(fs.readFileSync(edited)),after=readGlb(fs.readFileSync(output)),report=JSON.parse(fs.readFileSync(output+'.transfer.json'));
 assert.equal(report.unmatched,0);assert.ok(report.interpolated>0);assert.ok(report.corrected>0);assert.equal(report.otherBinaryDataUnchanged,true);
 assert.deepEqual(after.json.animations,before.json.animations);assert.deepEqual(after.json.nodes,before.json.nodes);assert.deepEqual(after.json.skins,before.json.skins);assert.deepEqual(after.json.materials,before.json.materials);
 const changed=new Set();
 for(const mesh of before.json.meshes)for(const p of mesh.primitives)if(before.json.materials[p.material]?.normalTexture){changed.add(p.attributes.NORMAL);for(const t of p.targets??[])if(t.NORMAL!==undefined)changed.add(t.NORMAL);}
 const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
 for(let i=0;i<before.json.accessors.length;i++)if(!changed.has(i)){
  const a=before.json.accessors[i];assert.deepEqual(after.json.accessors[i],a);
  if(a.bufferView!==undefined){const b=before.json.bufferViews[a.bufferView],size=components[a.type]*sizes[a.componentType];
   for(let row=0;row<a.count;row++){const start=(b.byteOffset??0)+(a.byteOffset??0)+row*(b.byteStride??size);assert.deepEqual(after.bin.subarray(start,start+size),before.bin.subarray(start,start+size));}
  }
  if(a.sparse)for(const field of ['indices','values']){const b=before.json.bufferViews[a.sparse[field].bufferView],start=b.byteOffset??0;assert.deepEqual(after.bin.subarray(start,start+b.byteLength),before.bin.subarray(start,start+b.byteLength));}
 }
 for(const image of before.json.images){const b=before.json.bufferViews[image.bufferView],start=b.byteOffset??0;assert.deepEqual(after.bin.subarray(start,start+b.byteLength),before.bin.subarray(start,start+b.byteLength));}
 // Only test-owned files in the unique temporary directory are removed.
 for(const entry of fs.readdirSync(directory))fs.unlinkSync(path.join(directory,entry));fs.rmdirSync(directory);
});

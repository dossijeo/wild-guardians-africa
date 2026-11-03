import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';

test('far atlas conversion plan covers manifest day and night assets with alpha metadata',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'wg-far-ktx-'));try{
  const output=join(directory,'plan.json');await promisify(execFile)(process.execPath,['tools/experiments/plan_far_vegetation_ktx2_batch.mjs',output]);
  const plan=JSON.parse(await readFile(output,'utf8')),manifest=JSON.parse(await readFile('public/content/far-vegetation.json','utf8')),expected=Object.values(manifest.biomes).reduce((n,rows)=>n+rows.length*2,0);
  assert.equal(plan.records.reduce((n,r)=>n+r.uses.length,0),expected);
  for(const record of plan.records){assert.equal(record.kind,'color');assert.ok(record.source.startsWith('public/assets/far-vegetation/'));for(const use of record.uses){assert.match(use.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(['day','night'].includes(use.lighting));assert.ok(use.alphaEncoding);}}
 }finally{await rm(directory,{recursive:true,force:true});}
});

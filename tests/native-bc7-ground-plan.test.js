import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';

test('ground conversion plan preserves raw and sRGB uses and reports unsupported sizes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'wg-ground-ktx-'));try{
  const output=join(directory,'plan.json');await promisify(execFile)(process.execPath,['tools/experiments/plan_ground_ktx2_batch.mjs',output]);
  const plan=JSON.parse(await readFile(output,'utf8')),tiles=JSON.parse(await readFile('public/content/ground-materials.json','utf8')),all=[...plan.records,...plan.unresolved];
  for(const [biome,tile] of Object.entries(tiles))for(const role of ['base','normal','arh'])if(tile[role])assert.ok(all.some(r=>r.uses.some(u=>u.biome===biome&&u.role===role&&u.consumer==='BiomeGround raw sampler')));
  const mud=all.filter(r=>r.uses.some(u=>u.consumer==='MudPatches'&&u.role==='base'));assert.equal(mud.length,1);assert.equal(mud[0].kind,'color');assert.ok(all.some(r=>r.source===mud[0].source&&r.kind==='data'));
  for(const row of plan.records)assert.equal((row.width%4)+(row.height%4),0);for(const row of plan.unresolved)assert.ok(row.width%4||row.height%4);
 }finally{await rm(directory,{recursive:true,force:true});}
});

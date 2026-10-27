import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=process.argv[2];assert(root,'Expected completed shadow A/B/A/B directory');
const read=p=>JSON.parse(readFileSync(p));
const rows=[false,true,false,true].map((candidate,i)=>{const dir=`${root}/${i+1}-${candidate?'candidate':'baseline'}`;return {candidate,p:read(dir+'/provenance.json'),r:read(dir+'/raid-ui.json')};});
for(const row of rows){
 assert.equal(row.p.wasmSha256,rows[0].p.wasmSha256,'Native runtime must remain identical');
 assert(row.r.runtimeOverride?.loads?.['spatial-threaded.wasm']>0,'Shared candidate runtime not loaded');
 assert.deepEqual(row.p.shadowSources,rows[row.candidate?1:0].p.shadowSources,'Shadow sources changed during sequence');
 assert.equal(Boolean(row.p.conditions.WG_SHADOW_SOURCE_DIR),!row.candidate,'Baseline source override mismatch');
}
assert.notDeepEqual(rows[0].p.shadowSources,rows[1].p.shadowSources,'No shadow treatment difference');
await import('./compare-release-border-abab.mjs');

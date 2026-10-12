import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const root=resolve(process.argv[2]??'docs/qa/proof-terrain-query-cache-794b');
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(root+'/manifest.json'));
for(const [path,expected] of Object.entries(manifest.payloads)){
 const packed=readFileSync(root+'/'+path),raw=gunzipSync(packed);
 assert.equal(sha(packed),expected.gzipSHA,path);assert.equal(sha(raw),expected.rawSHA,path);
}
const read=p=>gunzipSync(readFileSync(root+'/native-original/'+p+'.gz'));
const launch=JSON.parse(read('launch.json')),summary=JSON.parse(read('summary.json'));
assert.equal(summary.status,'passed-exact-parity');assert.deepEqual(launch.order,['A1','B1','B2','A2']);
const arms=launch.order.map(label=>JSON.parse(read(label+'.json'))),first=arms[0];
for(const arm of arms){
 assert.equal(arm.initialSHA,first.initialSHA);assert.equal(arm.preparedSHA,first.preparedSHA);
 assert.equal(arm.finalSHA,first.finalSHA);assert.equal(arm.action,first.action);
 assert.deepEqual(arm.decision,first.decision);assert.equal(sha(read(arm.label+'-state.json')),arm.finalSHA);
 assert.deepEqual(summary.arms.find(r=>r.label===arm.label),Object.fromEntries(Object.entries(arm).filter(([k])=>k!=='decision')));
}
for(const [path,hash] of Object.entries(launch.sourceFiles))assert.equal(sha(readFileSync(root+'/frozen-source/'+path)),hash,path);
const a=(arms[0].actMs+arms[3].actMs)/2,b=(arms[1].actMs+arms[2].actMs)/2;
assert.ok(b>a,'The preserved candidate is a performance negative');
console.log(JSON.stringify({status:'verified-negative',payloads:Object.keys(manifest.payloads).length,source:manifest.source,fullStateSHA:first.finalSHA,decisionParity:true,meanControlMs:a,meanCacheMs:b,relativeCostIncrease:b/a-1,enabledForProduction:false},null,2));

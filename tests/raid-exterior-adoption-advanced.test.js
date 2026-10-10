import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {raidExteriorInputKey,raidExteriorDiagnostics} from '../src/world/raid-exterior.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {activeChunkRegion} from '../src/world/active-region.js';
test('advanced retained legal farm: owned worker preparation transfers graph, main adoption and spawn never build it',()=>{
 const bytes=readFileSync(new URL('../docs/qa/horde-self-consistent-pilot-e040ea6f-20/native-original/responsible/state.json.gz',import.meta.url)),s=deserialize(gunzipSync(bytes).toString()),profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile,nav=new Navigation(s.seed,s.biome,profile);
 nav.setState(s);const center=s.structures.find(w=>w.kind==='center'),eye={x:center.x+1,z:center.z+1};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:['warthog'],done:false};
 const original=serialize(s),worker={requests:[],postMessage(data){this.requests.push(data);},terminate(){}},preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});
 const keyStart=performance.now();const geometryKey=raidExteriorInputKey(s,nav);const keyMs=performance.now()-keyStart;
 const requestStart=performance.now();preparer.update(s);const requestMs=performance.now()-requestStart;
 const computeStart=performance.now();const reply=computeRaidEntry(worker.requests[0]);const privateComputeMs=performance.now()-computeStart;
 assert.equal(serialize(s),original);assert.ok(reply.geometry.regions[0][1].length);const adoptStart=performance.now();worker.onmessage({data:reply});const adoptionMs=performance.now()-adoptStart;
 assert.equal(preparer.stats.accepted,1);assert.deepEqual(raidExteriorDiagnostics(nav),{builds:0,adoptions:1});assert.equal(serialize(s),original);
 const spawnStart=performance.now();spawnRaid(s,{group:['warthog']},nav);const spawnMs=performance.now()-spawnStart;assert.ok(s.raid);assert.equal(raidExteriorDiagnostics(nav).builds,0);
 console.log(JSON.stringify({scope:'single descriptive CPU sample, in-process private navigator stands in for browser worker computation; no concurrent performance comparison/frame claim',originalGzipSHA256:createHash('sha256').update(bytes).digest('hex'),walls:103,livePlants:865,geometryKeyBytes:Buffer.byteLength(geometryKey),replyJSONBytes:Buffer.byteLength(JSON.stringify(reply)),keyMs,requestMs,privateComputeMs,adoptionMs,spawnMs,mainGraph:raidExteriorDiagnostics(nav)}));preparer.dispose();
});

test('worker unavailable remains an explicit cold fallback blocker, without suppressing native spawn',()=>{
 const bytes=readFileSync(new URL('../docs/qa/horde-self-consistent-pilot-e040ea6f-20/native-original/responsible/state.json.gz',import.meta.url)),s=deserialize(gunzipSync(bytes).toString()),profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile,nav=new Navigation(s.seed,s.biome,profile);
 nav.setState(s);const center=s.structures.find(w=>w.kind==='center'),eye={x:center.x+1,z:center.z+1};nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:['warthog'],done:false};
 const preparer=new RaidEntryPreparer(nav,{createWorker:()=>{throw Error('Unavailable');}});preparer.update(s);assert.equal(preparer.stats.failed,1);
 const begin=performance.now();spawnRaid(s,{group:['warthog']},nav);const coldSpawnMs=performance.now()-begin;assert.ok(s.raid);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.ok(raidExteriorDiagnostics(nav).builds>0);
 console.log(JSON.stringify({scope:'negative performance gate retained; native direct fallback still builds cold graph synchronously, NOT production acceptance',coldSpawnMs,mainGraph:raidExteriorDiagnostics(nav)}));preparer.dispose();
});

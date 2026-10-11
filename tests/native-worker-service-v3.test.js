import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeWorkerServiceProofV2} from '../tools/native-worker-service-proof-v2.mjs';
import {nativeWorkerServiceProofV3} from '../tools/native-worker-service-proof-v3.mjs';
function fixture(){
 const s=deserialize(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/native-paid-canyon-contact-contour-v1-state.json.gz',import.meta.url))).toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 return {s,nav};
}
function addReturning(s){
 const village=s.villages[0],home=village.entry??village;
 const worker={...s.workers[0],id:'qa-returning',status:'returning',villageId:village.id,x:home.x,z:home.z,path:null};
 s.workers.push(worker);return worker;
}
test('active service and crop checks retain the complete v2 result',()=>{
 const {s,nav}=fixture(),before=serialize(s),expected=nativeWorkerServiceProofV2(s,nav),actual=nativeWorkerServiceProofV3(s,nav);
 assert(expected.valid);assert(actual.valid);assert.deepEqual(actual.checks,expected.checks);assert.deepEqual(actual.returnChecks,[]);assert.equal(serialize(s),before);
});
test('returning workers require home access without changing active service checks',()=>{
 const {s,nav}=fixture(),expected=nativeWorkerServiceProofV2(s,nav);addReturning(s);nav.setState(s);
 const before=serialize(s),actual=nativeWorkerServiceProofV3(s,nav);
 assert(actual.valid);assert.deepEqual(actual.checks,expected.checks);assert.equal(actual.returnChecks[0].workerId,'qa-returning');assert.equal(actual.returnChecks[0].via,'native-home');assert.equal(serialize(s),before);
});
test('a returning worker with no home route is rejected rather than ignored',()=>{
 const {s,nav}=fixture(),w=addReturning(s);w.x=1e6;w.z=1e6;
 const ordinary=nav.workerPath.bind(nav);nav.workerPath=(actor,...args)=>actor.id===w.id?null:ordinary(actor,...args);
 nav.obstacles=[];nav.field.slope=()=>0;
 const actual=nativeWorkerServiceProofV3(s,nav);
 assert.equal(actual.valid,false);assert.equal(actual.reason,'native-worker-home-route-unproven');assert.equal(actual.workerId,w.id);
});
test('missing home and absent active workforce remain failures',()=>{
 const {s,nav}=fixture(),w=addReturning(s);w.villageId='missing';
 assert.equal(nativeWorkerServiceProofV3(s,nav).reason,'native-worker-home-missing');
 w.villageId=s.villages[0].id;s.workers=[w];nav.setState(s);
 assert.equal(nativeWorkerServiceProofV3(s,nav).reason,'worker-passage-not-observable');
});
test('return validation cannot hide a living crop with a missing centre',()=>{
 const {s,nav}=fixture();addReturning(s);s.plants.find(p=>p.alive).centerId='missing';nav.setState(s);
 const proof=nativeWorkerServiceProofV3(s,nav);assert.equal(proof.valid,false);assert.equal(proof.reason,'native-crop-centre-not-operational');
});

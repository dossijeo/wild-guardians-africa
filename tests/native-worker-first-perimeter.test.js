import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeIntegratedPerimeterProof} from '../tools/native-integrated-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from '../tools/native-worker-service-proof-v3.mjs';

const root=new URL('../docs/qa/integrated-spiritual-survival/',import.meta.url);
const plan={pieces:[],updates:[],suppressed:[]};
function fixture(){
 const s=deserialize(gunzipSync(readFileSync(new URL('native-paid-canyon-contact-contour-v1-state.json.gz',root))).toString());
 const contour=JSON.parse(readFileSync(new URL('native-paid-canyon-contact-contour-v1.json',root))).attempts[0];
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return {s,nav,contour};
}
const physical=proof=>{const {terrainTileDiagnostics,...rest}=proof;return rest;};
test('worker-first rejects missing native workforce without running an animal proof',()=>{
 const {s,nav,contour}=fixture();s.workers=[];const before=serialize(s),lattice=nav.field.lattice;
 const original=nav.forBuildingPlacement.bind(nav);
 nav.forBuildingPlacement=(...args)=>{const view=original(...args);view.approachPath=()=>{throw Error('Animal certificate must not run');};return view;};
 const proof=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,workerServiceProof:nativeWorkerServiceProofV3,workersFirst:true});
 assert.equal(proof.valid,false);assert.equal(proof.reason,'worker-passage-not-observable');assert.equal(proof.animalCertificateSkipped,true);
 assert.equal(proof.animalChecks,undefined);assert.equal(serialize(s),before);assert.equal(nav.field.lattice,lattice);
});
test('passing worker precondition preserves the complete physical certificate and runs once',()=>{
 const a=fixture(),b=fixture(),before=serialize(b.s);let calls=0;
 const expected=nativeIntegratedPerimeterProof(a.s,a.nav,plan,a.contour.bounds,{outline:a.contour.points,workerServiceProof:nativeWorkerServiceProofV3,cache:false});
 const actual=nativeIntegratedPerimeterProof(b.s,b.nav,plan,b.contour.bounds,{outline:b.contour.points,workerServiceProof:(...args)=>{calls++;return nativeWorkerServiceProofV3(...args);},workersFirst:true,cache:false});
 assert(expected.valid);assert.deepEqual(physical(actual),physical(expected));assert.equal(calls,1);assert(actual.checks.length>0);assert.equal(serialize(b.s),before);
});
test('worker-first cannot certify an opened animal perimeter even with serviceable workers',()=>{
 const {s,nav,contour}=fixture();s.structures=s.structures.filter(c=>c.kind!=='wall');nav.setState(s);const before=serialize(s);
 assert(nativeWorkerServiceProofV3(s,nav).valid);
 const proof=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,workerServiceProof:nativeWorkerServiceProofV3,workersFirst:true,cache:false});
 assert.equal(proof.valid,false);assert.equal(proof.animalCertificateSkipped,undefined);assert.equal(serialize(s),before);
});

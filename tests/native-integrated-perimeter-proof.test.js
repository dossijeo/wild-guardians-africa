import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeIntegratedPerimeterProof} from '../tools/native-integrated-perimeter-proof.mjs';
import {nativePerimeterReusedCandidateV2} from '../tools/native-perimeter-reused-candidate-v2.mjs';
const root=new URL('../docs/qa/integrated-spiritual-survival/',import.meta.url),plan={pieces:[],updates:[],suppressed:[]};
function fixture(){
 const s=deserialize(gunzipSync(readFileSync(new URL('native-paid-canyon-contact-contour-v1-state.json.gz',root))).toString());
 const contour=JSON.parse(readFileSync(new URL('native-paid-canyon-contact-contour-v1.json',root))).attempts[0];
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return {s,nav,contour};
}
test('integrated QA proof preserves certificates and restores terrain resource ownership',()=>{
 const a=fixture(),b=fixture(),before=serialize(b.s),original=b.nav.field.lattice;
 const expected=nativePerimeterReusedCandidateV2(a.s,a.nav,plan,a.contour.bounds,{outline:a.contour.points,cache:false});
 const actual=nativeIntegratedPerimeterProof(b.s,b.nav,plan,b.contour.bounds,{outline:b.contour.points,cache:false});
 const {terrainTileDiagnostics,integrationVersion,...certificate}=actual;
 assert(expected.valid);assert.deepEqual(certificate,expected);assert.equal(integrationVersion,'contact-service-reuse-v2');
 assert(terrainTileDiagnostics.hits>0);assert(terrainTileDiagnostics.typedArrayBytes<=147456);
 assert.equal(b.nav.field.lattice,original);assert.equal(Object.hasOwn(b.nav.field,'lattice'),false);assert.equal(serialize(b.s),before);
});
test('an exception in the proof also restores the native lattice method',()=>{
 const {s,nav,contour}=fixture(),original=nav.field.lattice,before=serialize(s);
 assert.throws(()=>nativeIntegratedPerimeterProof(s,nav,{pieces:[],updates:null},contour.bounds,{outline:contour.points}));
 assert.equal(nav.field.lattice,original);assert.equal(Object.hasOwn(nav.field,'lattice'),false);assert.equal(serialize(s),before);
});

test('reusing an animal certificate still requires a fresh worker-service check',()=>{
 const {s,nav,contour}=fixture();
 const first=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points});assert.equal(first.valid,true);
 s.workers=[];
 const second=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points});
 assert.equal(second.valid,false);assert.equal(second.reason,'worker-passage-not-observable');
 assert.deepEqual(second.animalChecks,first.checks,'retained static certificate is independent of worker availability');
});

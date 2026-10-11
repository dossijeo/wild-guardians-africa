import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeIntegratedPerimeterProof} from '../tools/native-integrated-perimeter-proof.mjs';
import {nativePerimeterReusedCandidateV2} from '../tools/native-perimeter-reused-candidate-v2.mjs';
import {nativeReusedServiceComponentProofV2} from '../tools/native-reused-service-component-proof-v2.mjs';
import {operational} from '../src/simulation/rules.js';
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

test('optional exact terrain memo preserves the entire physical certificate',()=>{
 const a=fixture(),b=fixture(),before=serialize(b.s),original=b.nav.terrainValid;
 const expected=nativeIntegratedPerimeterProof(a.s,a.nav,plan,a.contour.bounds,{outline:a.contour.points,cache:false});
 const actual=nativeIntegratedPerimeterProof(b.s,b.nav,plan,b.contour.bounds,{outline:b.contour.points,cache:false,terrainMemo:true});
 const physical=proof=>{const {terrainTileDiagnostics,terrainMemoDiagnostics,...rest}=proof;return rest;};
 assert.deepEqual(physical(actual),physical(expected));assert.equal(actual.valid,true);
 assert(actual.terrainMemoDiagnostics.hits>0);assert(actual.terrainMemoDiagnostics.maxEntries<=65536);
 assert.equal(b.nav.terrainValid,original);assert.equal(Object.hasOwn(b.nav,'terrainValid'),false);assert.equal(serialize(b.s),before);
});

test('terrain memo and lattice are both restored when certification throws',()=>{
 const {s,nav,contour}=fixture(),lattice=nav.field.lattice,terrain=nav.terrainValid;
 assert.throws(()=>nativeIntegratedPerimeterProof(s,nav,{pieces:[],updates:null},contour.bounds,{outline:contour.points,terrainMemo:true}));
 assert.equal(nav.field.lattice,lattice);assert.equal(nav.terrainValid,terrain);
 assert.equal(Object.hasOwn(nav,'terrainValid'),false);assert.equal(Object.hasOwn(nav.field,'lattice'),false);
});

test('retired anchor coverage is freshly reproducible from original geometric origins and rejects opened walls',()=>{
 const {s,nav,contour}=fixture();
 assert(s.plants.filter(p=>p.alive).length>1);
 const first=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points});assert.equal(first.valid,true);
 const anchor=first.checks[0].anchorTargetId,crop=s.plants.find(p=>p.id===anchor);assert(crop);
 // Static diagnostic control only: no synthetic harvest/income is credited.
 crop.alive=false;const before=serialize(s);
 const retained=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points});
 assert.equal(retained.valid,true);
 assert(retained.animalCertificateCoverage.retiredAnchorTargetIds.includes(anchor));
 assert((retained.animalChecks??retained.checks).length>0);
 const fresh=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,cache:false});
 // Fresh crop-only anchor selection lacks an interior seed, which is not an
 // escape route. Independently recertify every survivor from the old spatial
 // references using native body/contact, connectors and positive components.
 assert.equal(fresh.valid,false);assert.equal(fresh.reason,'no-clear-interior-crop');
 const view=nav.forBuildingPlacement({id:'qa-empty-reference',x:1e12,z:1e12,radius:0,kind:'house'});
 view.obstacles=[...nav.obstacles];
 const targets=[...s.plants.filter(p=>p.alive),...s.structures.filter(operational)];
 for(const check of first.checks){
  assert.equal(view.walkable(check.inside.x,check.inside.z,check.radius,null,false),true);
  assert.equal(view.walkable(check.outside.x,check.outside.z,check.radius,null,false),true);
  view.approachPath(check.outside,check.inside,check.radius,32);
  const recomputed=nativeReusedServiceComponentProofV2(s,view,targets,check.radius,check.outside,contour.points);
  assert.equal(recomputed.valid,true,recomputed.reason);assert.equal(recomputed.poses,32*targets.length);
 }
 assert.equal(serialize(s),before);
 s.structures=s.structures.filter(p=>p.kind!=='wall');nav.setState(s);
 const opened=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points});
 assert.equal(opened.valid,false);assert.equal(opened.reason,'no-clear-interior-crop');
 assert.equal(opened.animalCertificateCoverage,undefined);
});

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
import {plant} from '../src/simulation/game.js';
import {containsPoint,edgeDistance} from '../src/world/footprints.js';
const root=new URL('../docs/qa/integrated-spiritual-survival/',import.meta.url),plan={pieces:[],updates:[],suppressed:[]};
function fixture(){
 const s=deserialize(gunzipSync(readFileSync(new URL('native-paid-canyon-contact-contour-v1-state.json.gz',root))).toString());
 const contour=JSON.parse(readFileSync(new URL('native-paid-canyon-contact-contour-v1.json',root))).attempts[0];
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);return {s,nav,contour};
}

test('incremental new crop coverage matches independent complete native certification',()=>{
 const {s,nav,contour}=fixture();
 const first=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,incrementalCrops:true});assert(first.valid);
 const polygon=contour.points.map(([x,z])=>({x,z}));let added;
 outer:for(let z=Math.ceil(contour.bounds[1])+1;z<contour.bounds[3]-1;z+=1.2)for(let x=Math.ceil(contour.bounds[0])+1;x<contour.bounds[2]-1;x+=1.2){
  if(!containsPoint(polygon,x,z)||polygon.some((p,i)=>edgeDistance(p,polygon[(i+1)%polygon.length],x,z)<2.5)||s.plants.some(p=>p.alive&&Math.hypot(p.x-x,p.z-z)<1.1))continue;
  const placement=nav.placement(x,z,.4);if(!placement.valid||placement.suppress?.length)continue;
  plant(s,'qa-incremental-native-seed','mijo',x,z,nav);added=s.plants.at(-1);break outer;
 }
 assert(added,'Native fixture needs a legal interior seed');
 const before=serialize(s),incremental=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,incrementalCrops:true});
 assert(incremental.valid,JSON.stringify({reason:incremental.reason,targetId:incremental.targetId,incrementalFailure:incremental.incrementalFailure,added}));assert(incremental.animalCertificateCoverage);
 for(const check of incremental.checks){
  assert.deepEqual(check.incrementalServices.latestTargetIds,[added.id]);assert.equal(check.incrementalServices.latest.poses,32);
  const independent=nav.forBuildingPlacement({id:'qa-empty-independent',x:1e12,z:1e12,radius:0,kind:'house'});independent.obstacles=[...nav.obstacles];
  const complete=nativeReusedServiceComponentProofV2(s,independent,[...s.plants.filter(p=>p.alive),...s.structures.filter(operational)],check.radius,check.outside,contour.points);
  assert(complete.valid,'Every current target must independently pass all native poses from the retained exterior origin');
 }
 const full=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,cache:false});
 assert(full.valid);assert.deepEqual(incremental.workerService,full.workerService);assert.equal(serialize(s),before);
});

test('a legal near-boundary new crop with an unproven native origin is not certified',()=>{
 const {s,nav,contour}=fixture();
 assert(nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,incrementalCrops:true}).valid);
 assert(plant(s,'qa-near-boundary-seed','mijo',-24.400000000000002,52,nav));
 const before=serialize(s),candidate=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,incrementalCrops:true});
 assert.equal(candidate.valid,false);assert.equal(candidate.reason,'native-service-origin-unproven');
 const complete=nativeIntegratedPerimeterProof(s,nav,plan,contour.bounds,{outline:contour.points,cache:false});
 assert.equal(complete.valid,false,'Complete native certification also cannot prove this target');assert.equal(serialize(s),before);
});
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

import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {nativeClosedApproachCertificate} from '../tools/native-closed-approach-certificate.mjs';
import {nativeServiceComponentProof} from '../tools/native-service-component-proof.mjs';
import {navigationPathKey} from '../src/world/raid-navigation-warmth.js';
import {withNavigationQueries,rememberNavigationQuery} from '../src/world/navigation-query-scope.js';
const outside={x:14,z:0},point={x:0,z:0},outline=[[-8,-8],[8,-8],[8,8],[-8,8]],radius=.7;
function fixture(closed=true){
 const {s,nav}=createOpeningWorld({seed:123});nav.field.slope=()=>0;nav.field.surface=()=>0;nav.field.fluidInside=()=>false;nav.propsAt=()=>[];
 const box=(id,a,b,c,d)=>({id,kind:'house',x:(a+c)/2,z:(b+d)/2,footprint:[{x:a,z:b},{x:c,z:b},{x:c,z:d},{x:a,z:d}]});
 nav.obstacles=[box('left',-7,-7,-6,7),box('right',6,-7,7,7),box('back',-7,-7,7,-6),...(closed?[box('front',-7,6,7,7)]:[])];
 return {s,nav};
}
test('complete native closed component skips approach while reports and state remain exact',()=>{
 const {s,nav}=fixture(),before=serialize(s);assert.equal(nav.approachPath(outside,point,radius,32),null);assert.ok(nav.closedRegions.size);
 const reference=nativeServiceComponentProof(s,nav,[{id:'unit-target',x:0,z:0}],radius,outside,outline);
 nav.failedPaths.clear();let hits=0;const start=performance.now();const candidate=nativeServiceComponentProof(s,nav,[{id:'unit-target',x:0,z:0}],radius,outside,outline,{sharedCertificate:true,onCertificate:r=>hits+=Number(r.certificate)});
 assert.deepEqual(candidate,reference);assert.equal(candidate.valid,true);assert.equal(hits,32);assert.equal(serialize(s),before);console.log(JSON.stringify({scope:'controlled native Navigation closed-obstacle unit, not paid farm',certificateHits:hits,poses:candidate.poses,descriptiveCandidateMs:performance.now()-start}));
 const arms=[];for(const label of ['A1','B1','B2','A2']){nav.failedPaths.clear();const at=performance.now(),report=nativeServiceComponentProof(s,nav,[{id:'unit-target',x:0,z:0}],radius,outside,outline,{sharedCertificate:label[0]==='B'});assert.deepEqual(report,reference);arms.push({label,ms:performance.now()-at});}console.log(JSON.stringify({scope:'warm controlled unit ABBA, not full protected policy or renderer',arms}));
});
test('open direct or detour geometry never becomes a negative reachability certificate',()=>{
 const {s,nav}=fixture(false);assert.equal(nativeClosedApproachCertificate(nav,outside,point,radius),false);
 assert.deepEqual(nativeServiceComponentProof(s,nav,[{id:'t',x:0,z:0}],radius,outside,outline,{sharedCertificate:true}),nativeServiceComponentProof(s,nav,[{id:'t',x:0,z:0}],radius,outside,outline));
});
test('prepared and query-scoped routes retain native priority over component shortcut',()=>{
 const {nav}=fixture();nav.approachPath(outside,point,radius,32);nav.failedPaths.clear();const key=navigationPathKey(point,outside,radius,null,false,32),route=[outside];
 nav.preparedPaths={version:nav.version,entries:new Map([[key,route]])};assert.equal(nativeClosedApproachCertificate(nav,outside,point,radius),false);nav.preparedPaths=null;
 withNavigationQueries(nav,()=>{rememberNavigationQuery(nav,key,route);assert.equal(nativeClosedApproachCertificate(nav,outside,point,radius),false);});
 assert.equal(nativeClosedApproachCertificate(nav,outside,point,radius),true);assert.equal(nav.failedPaths.has(key),true);
});
test('epoch invalidation and empty or incomplete regions remain ordinary-navigation cases',()=>{
 const {s,nav}=fixture();nav.approachPath(outside,point,radius,32);nav.failedPaths.clear();const regions=new Map(nav.closedRegions);nav.closedRegions.delete(`${radius}:null:false|0,0`);assert.equal(nativeClosedApproachCertificate(nav,outside,point,radius),false);nav.closedRegions=regions;
 const walk=nav.walkable;nav.walkable=(x,z,...args)=>Number.isInteger(x)&&Number.isInteger(z)&&Math.abs(x)<=1&&Math.abs(z)<=1?false:walk.call(nav,x,z,...args);assert.equal(nativeClosedApproachCertificate(nav,outside,point,radius),false);nav.walkable=walk;
 nav.setState(s);assert.equal(nativeClosedApproachCertificate(nav,outside,point,radius),false);
});
test('retained real Q15 paid-farm snapshot gives exact bounded service report and state',()=>{
 const raw=gunzipSync(readFileSync('docs/qa/native-balance-parallel-short/native-original/state.json.gz')).toString(),s=deserialize(raw),profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json')).profile;
 const run=enabled=>{const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);const targets=s.plants.filter(p=>p.alive).slice(0,2),x=targets[0].x,z=targets[0].z;return nativeServiceComponentProof(s,nav,targets,radius,{x:x+12,z},[[x-9,z-9],[x+9,z-9],[x+9,z+9],[x-9,z+9]],{sharedCertificate:enabled});};
 assert.deepEqual(run(true),run(false));assert.equal(serialize(s),raw);
});

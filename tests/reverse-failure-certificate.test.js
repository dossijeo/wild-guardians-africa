import test from 'node:test';import assert from 'node:assert/strict';import {reverseFailureCertified,boundedApproachRegionBlocked} from '../src/world/reverse-failure-certificate.js';
import {Navigation} from '../src/world/navigation.js';import {centerBoundaryPoint} from '../src/world/centers.js';
const fixture=()=>({nodes:new Set(['0,0']),minX:-2,maxX:2,minZ:-2,maxZ:2});
const nav=()=>({walkable:(x,z)=>z===0&&[0,1,2].includes(x),segmentClear:(a,b)=>a.x===b.x});
test('An exhaustive directed region rejects a reverse route only with verified incoming boundary and all destination connectors',()=>{
 const r=fixture(),n=nav();assert.equal(reverseFailureCertified(n,r,[{x:2,z:0}],{x:0,z:0},.9,null,false),true);assert.equal(r.incomingVerified,true);
});

test('Group accessibility can reject only a fully covered, disjoint service zone with incoming proof',()=>{
 const n=nav(),r={...fixture(),minX:-100,maxX:100,minZ:-100,maxZ:100,radius:.9,ignore:null,worker:false};n.searchedRegions=[r];
 assert.equal(boundedApproachRegionBlocked(n,{x:0,z:0},.9,10,-1,20,1),true);
 assert.equal(boundedApproachRegionBlocked(n,{x:0,z:0},.9,-1,-1,20,1),false,'One reachable origin defeats whole-group rejection');
 assert.equal(boundedApproachRegionBlocked(n,{x:0,z:0},.9,80,-1,90,1),false,'Original service corridors must fit inside the witness');
 assert.equal(boundedApproachRegionBlocked(n,{x:0,z:0},1.1,10,-1,20,1),false,'Body radii cannot share proofs');
 r.worker=true;assert.equal(boundedApproachRegionBlocked(n,{x:0,z:0},.9,10,-1,20,1),false);
});

test('A large centre cannot be rejected using a crop-sized circle when its hull approach is reachable',()=>{
 const n=new Navigation(123,'sabana',{}),center={id:'center',kind:'center',culture:'saheliana',x:10,z:0},actor={x:0,z:0};
 n.state={culture:'saheliana'};n.walkable=(x,z)=>x>=0&&x<=2.5&&Math.abs(z)<1e-8;n.segmentClear=(a,b)=>n.walkable(a.x,a.z)&&n.walkable(b.x,b.z);
 n.searchedRegions=[{nodes:new Set(['0,0','1,0','2,0']),minX:-100,maxX:100,minZ:-100,maxZ:100,radius:1,ignore:null,worker:false,incomingVerified:true}];
 const point=centerBoundaryPoint(center,-Math.PI/2,1.5,n.state);assert(n.segmentClear(actor,point));
 assert.equal(boundedApproachRegionBlocked(n,actor,1,6,-4,14,4),true,'The incorrect crop circle would discard this valid approach');
 assert.equal(n.approachRegionBlocked(actor,center,1,1.6),false);
 assert.deepEqual(n.approachPath(actor,point,1,32),[{x:point.x,z:point.z}]);
});
test('A one-way incoming connection cannot be treated as a symmetric failure',()=>{
 const r=fixture(),n=nav();n.segmentClear=(a,b)=>a.x===b.x||a.x===1&&b.x===0||a.x===0&&b.x===-.75;
 assert.equal(reverseFailureCertified(n,r,[{x:2,z:0}],{x:-.75,z:0},.9,null,false),false);assert.equal(r.incomingVerified,false);
});
test('Partial goal connector coverage, shared origins and worker portals cannot be rejected',()=>{
 const n=nav();n.segmentClear=()=>true;
 assert.equal(reverseFailureCertified(n,fixture(),[{x:2,z:0}],{x:0,z:0},.9,null,false),false);
 assert.equal(reverseFailureCertified(nav(),fixture(),[{x:0,z:0}],{x:0,z:0},.9,null,false),false);
 assert.equal(reverseFailureCertified(nav(),fixture(),[{x:2,z:0}],{x:0,z:0},.9,null,true),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeServiceComponentProof} from '../tools/native-service-component-proof.mjs';
const outline=[[-5,-5],[5,-5],[5,5],[-5,5]],outside={x:20,z:0},targets=[{id:'crop',x:0,z:0}],radius=1;
function view(){
 const closedRegions=new Map(),region=new Set(['0,0','1,0']);
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)closedRegions.set(`${radius}:null:false|${x},${z}`,region);
 return {closedRegions,walkable:()=>true,segmentClear:(_a,b)=>b.x!==20,approachPath:()=>null};
}
test('a bounded failed search alone never certifies an enclosure',()=>{
 const v=view();v.closedRegions.clear();const proof=nativeServiceComponentProof({},v,targets,radius,outside,outline);
 assert.equal(proof.valid,false);assert.equal(proof.reason,'native-service-component-unproven');
});
test('only positively complete components wholly inside the outline certify poses',()=>{
 const v=view(),proof=nativeServiceComponentProof({},v,targets,radius,outside,outline);assert(proof.valid);assert.equal(proof.poses,32);assert.equal(proof.certified,32);assert.equal(proof.emptyNativeOrigins,0);
 v.closedRegions=new Map([...v.closedRegions].map(([k])=>[k,new Set(['0,0','20,0'])]));assert.equal(nativeServiceComponentProof({},v,targets,radius,outside,outline).valid,false);
});
test('a valid direct route or native detour rejects the proposed defense',()=>{
 const v=view();v.segmentClear=()=>true;assert.equal(nativeServiceComponentProof({},v,targets,radius,outside,outline).reason,'native-service-direct-route-open');
 v.segmentClear=(_a,b)=>b.x!==20;v.approachPath=()=>[{x:0,z:0}];assert.equal(nativeServiceComponentProof({},v,targets,radius,outside,outline).reason,'native-service-route-open');
});
test('only a positive closed-region certificate may bypass the full animal route',()=>{
 const certified=view();certified.approachRegionBlocked=()=>true;
 const segment=certified.segmentClear;let segments=0;
 certified.segmentClear=(...args)=>{segments++;return segment(...args);};
 certified.approachPath=()=>{throw Error('A certified pose must not repeat A*');};
 assert.equal(nativeServiceComponentProof({},certified,targets,radius,outside,outline).valid,true);
 assert.equal(segments,64); // One direct rejection and one physical connector per pose.
 const uncertified=view();uncertified.approachRegionBlocked=()=>false;
 let searched=0;uncertified.approachPath=()=>{searched++;return [{x:0,z:0}];};
 assert.equal(nativeServiceComponentProof({},uncertified,targets,radius,outside,outline).reason,'native-service-route-open');
 assert.equal(searched,1);
});
test('a closed-region certificate without a physical connector cannot prove service access',()=>{
 const v=view();v.approachRegionBlocked=()=>true;v.segmentClear=()=>false;
 assert.equal(nativeServiceComponentProof({},v,targets,radius,outside,outline).reason,'native-service-origin-unproven');
});
test('an empty origin frontier remains unproven without a positive physical connector',()=>{
 const v=view();v.walkable=(x,z)=>!Number.isInteger(x)||!Number.isInteger(z);v.closedRegions.clear();
 const proof=nativeServiceComponentProof({},v,targets,radius,outside,outline);assert.equal(proof.valid,false);assert.equal(proof.reason,'native-service-origin-unproven');
});

test('a body-valid pose with a solid obstacle blocking crop contact is not an attack position',()=>{
 const s={structures:[]},crop={id:'living',x:0,z:0,alive:true},v=view();
 v.version=1;
 v.obstacles=[{id:'solid',kind:'house',footprint:[{x:-2,z:.4},{x:2,z:.4},{x:2,z:.8},{x:-2,z:.8}]}];
 v.walkable=(x,z)=>Math.abs(x)<1e-8&&Math.abs(z-1.6)<1e-8;
 v.closedRegions.clear();
 const blocked=nativeServiceComponentProof(s,v,[crop],radius,outside,outline);
 assert(blocked.valid);assert.equal(blocked.blocked,32);assert.equal(blocked.certified,0);
 // Without the solid obstacle the same isolated pose must remain unproven.
 const clear={...v,obstacles:[]};
 assert.equal(nativeServiceComponentProof(s,clear,[crop],radius,outside,outline).reason,'native-service-origin-unproven');
});
test('native positive service certificates reuse unchanged crops but check new crops and geometry epochs',()=>{
 const s={structures:[]},v=view();v.state=s;v.version=1;v.approachRegionBlocked=()=>true;
 const segment=v.segmentClear;let segments=0;
 v.segmentClear=(...args)=>{segments++;return segment(...args);};
 const first={id:'first',x:0,z:0},second={id:'second',x:1,z:1};
 const a=nativeServiceComponentProof(s,v,[first],radius,outside,outline);
 assert(a.valid);assert.equal(segments,64);
 const b=nativeServiceComponentProof(s,v,[first],radius,outside,outline);
 assert.deepEqual(b,a);assert.equal(segments,64,'Identical physical service remains certified');
 const c=nativeServiceComponentProof(s,v,[first,second],radius,outside,outline);
 assert(c.valid);assert.equal(c.poses,64);assert.equal(segments,128,'Only the new target needs its 32 poses');
 v.version++;
 const d=nativeServiceComponentProof(s,v,[first,second],radius,outside,outline);
 assert.deepEqual(d,c);assert.equal(segments,256,'Geometry epoch invalidates all certificates');
});
test('nonlethal wall HP changes retain service certificates; collapse status invalidates them',()=>{
 const wall={id:'wall',kind:'wall',status:'intact',hp:100,x:3,z:0,yaw:0};
 const s={structures:[wall]},v=view();v.state=s;v.version=7;v.approachRegionBlocked=()=>true;
 const segment=v.segmentClear;let segments=0;
 v.segmentClear=(...args)=>{segments++;return segment(...args);};
 const crop={id:'crop',x:0,z:0};
 const first=nativeServiceComponentProof(s,v,[crop],radius,outside,outline);
 assert(first.valid);assert.equal(segments,64);
 wall.hp=99;
 assert.deepEqual(nativeServiceComponentProof(s,v,[crop],radius,outside,outline),first);
 assert.equal(segments,64,'HP-only wear does not alter service geometry');
 wall.status='collapsing';
 assert.deepEqual(nativeServiceComponentProof(s,v,[crop],radius,outside,outline),first);
 assert.equal(segments,128,'a structural status change invalidates the certificate');
 wall.status='intact';wall.gate=true;
 assert.deepEqual(nativeServiceComponentProof(s,v,[crop],radius,outside,outline),first);
 assert.equal(segments,192,'an in-place wall geometry change invalidates the certificate');
});

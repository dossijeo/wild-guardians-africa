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

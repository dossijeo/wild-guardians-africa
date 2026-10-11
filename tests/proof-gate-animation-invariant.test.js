import test from 'node:test';
import assert from 'node:assert/strict';
import {proofGeometrySignature} from '../tools/proof-geometry-signature-candidate.mjs';
import {staticAnimalCertificate} from '../tools/static-animal-certificate-cache.mjs';
import {nativePerimeterReusedCandidateV2} from '../tools/native-perimeter-reused-candidate-v2.mjs';
import {Navigation} from '../src/world/navigation.js';
function fixture(){
 const gate={id:'gate',kind:'wall',gate:true,gateOpen:0,x:4,z:2,material:'adobe',hp:60,status:'intact'};
 const state={plants:[{id:'crop',alive:true,x:1,z:2}],structures:[gate],villages:[],suppressed:[],culture:'mapungubwe'};
 const view={version:1,field:{},obstacles:[{...gate}]},plan={pieces:[],updates:[]};
 let calls=0;const query=enabled=>staticAnimalCertificate(state,view,plan,[0,0,10,10],null,()=>{calls++;return {valid:true,checks:[]};},{gateAnimationInvariant:enabled});
 return {state,view,gate,query,calls:()=>calls};
}
test('opt-in key omits only animated gate openness and never changes input data',()=>{
 const a={kind:'wall',gate:true,gateOpen:0,hp:60},b={...a,gateOpen:1},before=structuredClone(a);
 assert.equal(proofGeometrySignature(a,true),proofGeometrySignature(b,true));assert.notEqual(proofGeometrySignature(a),proofGeometrySignature(b));assert.deepEqual(a,before);
 for(const change of [{hp:59},{gate:false},{x:4},{yaw:1},{material:'piedra'},{status:'ruined'}])assert.notEqual(proofGeometrySignature(a,true),proofGeometrySignature({...a,...change},true));
 assert.notEqual(proofGeometrySignature({kind:'center',gateOpen:0},true),proofGeometrySignature({kind:'center',gateOpen:1},true));
});
test('animal certificate retains only gate-phase invariant coverage; damage and geometry still invalidate',()=>{
 const f=fixture();f.query(true);f.gate.gateOpen=.5;f.view.obstacles[0].gateOpen=.5;f.query(true);assert.equal(f.calls(),1);
 f.gate.hp--;f.query(true);assert.equal(f.calls(),2);
 f.gate.material='piedra';f.query(true);assert.equal(f.calls(),3);
 f.view.version++;f.query(true);assert.equal(f.calls(),4);
});
test('default certificate still invalidates on gate phase; custom proof adapters cannot opt into the invariant',()=>{
 const f=fixture();f.query(false);f.gate.gateOpen=1;f.query(false);assert.equal(f.calls(),2);
 assert.throws(()=>nativePerimeterReusedCandidateV2(f.state,f.view,{pieces:[],updates:[]},[0,0,10,10],{gateAnimationInvariant:true}),/requires native/);
});
test('native-shaped navigators with overridden physical methods are rejected before consulting coverage',()=>{
 for(const method of ['segmentClear','approachGroupBlocked','terrainValid','propsAt','forBuildingPlacement']){
  const nav=Object.create(Navigation.prototype);nav[method]=()=>true;
  assert.throws(()=>nativePerimeterReusedCandidateV2({},nav,{},[],{gateAnimationInvariant:true}),/requires native/,method);
 }
});
for(const [name,change] of [
 ['gate removed',f=>f.state.structures.splice(0,1)],
 ['gate moved',f=>f.gate.x++],
 ['gate rotated',f=>f.gate.yaw=.7],
 ['gate becomes solid wall',f=>f.gate.gate=false],
 ['obstacle removed',f=>f.view.obstacles.splice(0,1)],
 ['obstacle damaged',f=>f.view.obstacles[0].hp--],
 ['crop moved',f=>f.state.plants[0].x++],
 ['crop destroyed',f=>f.state.plants[0].alive=false],
 ['river level changed',f=>f.view.field.riverLevel=4],
 ['terrain query changed',f=>f.view.field.height=()=>4],
 ['new suppression',f=>f.state.suppressed.push('tree')]
])test(`gate-phase invariant still invalidates physical change: ${name}`,()=>{
 const f=fixture();f.query(true);f.gate.gateOpen=.5;f.query(true);assert.equal(f.calls(),1);
 change(f);f.query(true);assert.equal(f.calls(),2);
});

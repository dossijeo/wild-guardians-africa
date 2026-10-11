import test from 'node:test';
import assert from 'node:assert/strict';
import {staticAnimalCertificate} from '../tools/static-animal-certificate-cache.mjs';
function fixture(){
 const state={plants:[{id:'crop',alive:true,x:1,z:2,species:'mijo'}],structures:[{id:'wall',hp:10,status:'intact'}],villages:[],workers:[{x:2,z:3}],suppressed:[]};
 const view={version:1,obstacles:[],field:{c:{seed:712},heightCache:new Map(),height:()=>0}};
 const plan={pieces:[],updates:[]},bounds=[0,0,10,10],outline=[[0,0],[10,0],[10,10],[0,10],[0,0]];
 let calls=0;const compute=()=>{calls++;return {valid:true,checks:[{radius:1,certified:32}]};};
 return {state,view,plan,bounds,outline,query:()=>staticAnimalCertificate(state,view,plan,bounds,outline,compute),calls:()=>calls};
}
test('identical static proof is reused despite worker movement; returned diagnostics are isolated',()=>{
 const f=fixture(),first=f.query();first.checks[0].certified=0;f.state.workers[0].x+=10;
 assert.equal(f.query().checks[0].certified,32);assert.equal(f.calls(),1);
});
for(const [name,mutate] of [
 ['crop added',f=>f.state.plants.push({id:'new',alive:true,x:3,z:4})],
 ['crop destroyed',f=>f.state.plants[0].alive=false],
 ['crop moved',f=>f.state.plants[0].x++],
 ['wall damaged',f=>f.state.structures[0].hp--],
 ['geometry epoch',f=>f.view.version++],
 ['obstacle geometry',f=>f.view.obstacles.push({id:'new-wall',x:4,z:3})],
 ['proposal update',f=>f.plan.updates.push({id:'wall',gate:true})],
 ['bounds',f=>f.bounds[0]--],['outline',f=>f.outline[0][0]--],
 ['suppression',f=>f.state.suppressed.push('tree')],
 ['terrain configuration',f=>f.view.field.c.seed++],
 ['terrain cache replacement',f=>f.view.field.heightCache=new Map()],
 ['terrain function replacement',f=>f.view.field.height=()=>1],
 ['navigation adapter replacement',f=>f.view.walkable=()=>false]
])test(`static certificate invalidates on ${name}`,()=>{const f=fixture();f.query();mutate(f);f.query();assert.equal(f.calls(),2);});
test('negative proofs and explicitly uncached probes are never reused',()=>{
 const f=fixture();let calls=0;const compute=()=>{calls++;return {valid:false,reason:'unproven'};};
 for(let i=0;i<2;i++)staticAnimalCertificate(f.state,f.view,f.plan,f.bounds,f.outline,compute);
 assert.equal(calls,2);f.query();
 staticAnimalCertificate(f.state,f.view,f.plan,f.bounds,f.outline,()=>({valid:true}),{cache:false});
 f.query();assert.equal(f.calls(),2);
});

function anchoredFixture(){
 const f=fixture();f.state.plants.push({id:'harvested',alive:true,x:3,z:4,species:'mijo'});
 let calls=0;const compute=()=>{calls++;return {valid:true,checks:[{anchorTargetId:'crop',inside:{x:1,z:2},outside:{x:20,z:2},radius:1,services:{poses:64}}]};};
 return {...f,query:()=>staticAnimalCertificate(f.state,f.view,f.plan,f.bounds,f.outline,compute),calls:()=>calls};
}
test('harvested nonanchor targets retain positive coverage with explicit historical census',()=>{
 const f=anchoredFixture();f.query();f.state.plants[1].alive=false;
 const retained=f.query();assert.equal(f.calls(),1);assert.equal(retained.valid,true);
 assert.equal(retained.retainedCoverage.certifiedCropCount,2);assert.equal(retained.retainedCoverage.currentCropCount,1);
 assert.deepEqual(retained.retainedCoverage.removedCropIds,['harvested']);assert.equal(retained.checks[0].services.poses,64);
});
for(const [name,mutate] of [
 ['survivor moved',f=>{f.state.plants[1].alive=false;f.state.plants[0].x++;}],
 ['new target replaces harvested target',f=>{f.state.plants[1].alive=false;f.state.plants.push({id:'new',alive:true,x:3,z:4});}],
 ['remaining targets reordered',f=>f.state.plants.reverse()],
 ['all targets removed',f=>f.state.plants.forEach(p=>p.alive=false)]
])test(`superset reuse rejects ${name}`,()=>{const f=anchoredFixture();f.query();mutate(f);f.query();assert.equal(f.calls(),2);});

test('harvested anchor survives only as an explicit geometric reference covering unchanged survivors',()=>{
 const f=anchoredFixture();f.query();f.state.plants[0].alive=false;
 const proof=f.query();assert.equal(f.calls(),1);assert.equal(proof.valid,true);
 assert.deepEqual(proof.retainedCoverage.retiredAnchorTargetIds,['crop']);
 assert.deepEqual(proof.retainedCoverage.removedCropIds,['crop']);
 assert.deepEqual(proof.checks[0].inside,{x:1,z:2});assert.deepEqual(proof.checks[0].outside,{x:20,z:2});
 f.state.plants[1].x++;f.query();assert.equal(f.calls(),2);
});

for(const [name,check] of [
 ['unknown original target',{anchorTargetId:'foreign',inside:{x:1,z:2},outside:{x:20,z:2}}],
 ['missing geometric coordinates',{anchorTargetId:'crop'}],
 ['nonfinite exterior coordinate',{anchorTargetId:'crop',inside:{x:1,z:2},outside:{x:Infinity,z:2}}]
])test(`retired-anchor reuse rejects ${name}`,()=>{
 const f=anchoredFixture();let calls=0;
 const query=()=>staticAnimalCertificate(f.state,f.view,f.plan,f.bounds,f.outline,()=>{calls++;return {valid:true,checks:[check]};});
 query();f.state.plants[0].alive=false;query();assert.equal(calls,2);
});

test('opt-in additions require fresh proof and retain only positive cumulative coverage',()=>{
 const f=anchoredFixture();f.query();f.state.plants.push({id:'new',alive:true,x:4,z:5,species:'mijo'});
 let extended=0,cold=0;
 const query=()=>staticAnimalCertificate(f.state,f.view,f.plan,f.bounds,f.outline,()=>{cold++;return {valid:true};},{extend:(proof,added)=>{extended++;assert.deepEqual(added.map(p=>p.id),['new']);return proof;}});
 const proof=query();assert.equal(proof.valid,true);assert.equal(proof.retainedCoverage.certifiedCropCount,3);assert.equal(cold,0);assert.equal(extended,1);
 proof.checks[0].inside.x=999;assert.equal(query().checks[0].inside.x,1);assert.equal(extended,1);
 f.state.plants[0].alive=false;
 assert.deepEqual(query().retainedCoverage.retiredAnchorTargetIds,['crop']);assert.equal(cold,0);
});
test('failed additions remain failed on repeated attempts without replacing original positive coverage',()=>{
 const f=anchoredFixture();f.query();f.state.plants.push({id:'exposed',alive:true,x:20,z:20});let extended=0;
 const query=()=>staticAnimalCertificate(f.state,f.view,f.plan,f.bounds,f.outline,()=>{throw Error('Unexpected cold recomputation');},{extend:()=>{extended++;return {valid:false,reason:'physically-open'};}});
 assert.equal(query().valid,false);assert.equal(query().valid,false);assert.equal(extended,2);
 f.state.plants.pop();assert.equal(query().valid,true);
});
for(const [name,mutate] of [
 ['moved survivor',f=>f.state.plants[0].x++],['reordered survivors',f=>f.state.plants.reverse()],
 ['geometry change',f=>f.view.version++],['suppression change',f=>f.state.suppressed.push('tree')]
])test(`opt-in extension invalidates on ${name}`,()=>{
 const f=anchoredFixture();f.query();mutate(f);f.state.plants.push({id:'new',alive:true,x:4,z:5});let cold=0;
 staticAnimalCertificate(f.state,f.view,f.plan,f.bounds,f.outline,()=>{cold++;return {valid:false};},{extend:()=>{throw Error('Invalid extension');}});
 assert.equal(cold,1);
});

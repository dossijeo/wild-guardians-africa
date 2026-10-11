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

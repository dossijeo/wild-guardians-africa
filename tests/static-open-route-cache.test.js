import test from 'node:test';
import assert from 'node:assert/strict';
import {staticAnimalCertificate} from '../tools/static-animal-certificate-cache.mjs';
function fixture(reason='native-service-route-open'){
 const state={plants:[{id:'crop',alive:true,x:1,z:2,species:'mijo'}],structures:[{id:'wall',hp:10,status:'intact'}],villages:[],workers:[{x:2,z:3}],suppressed:[]};
 const view={version:1,obstacles:[],field:{c:{seed:123},heightCache:new Map(),height:()=>0}};
 const plan={pieces:[],updates:[]},bounds=[0,0,10,10],outline=[[0,0],[10,0],[10,10],[0,10],[0,0]];
 let calls=0;const compute=()=>{calls++;return {valid:false,reason,checks:[{services:{point:{x:1,z:2},targetId:'crop'}}]};};
 return {state,view,plan,bounds,outline,calls:()=>calls,query:options=>staticAnimalCertificate(state,view,plan,bounds,outline,compute,options)};
}
for(const reason of ['native-service-route-open','native-service-direct-route-open'])test(`exact physical route witness is reused: ${reason}`,()=>{
 const f=fixture(reason),first=f.query();first.checks[0].services.point.x=999;
 f.state.workers[0].x++;
 assert.equal(f.query().valid,false);assert.equal(f.query().checks[0].services.point.x,1);assert.equal(f.calls(),1);
 f.query({cache:false});assert.equal(f.calls(),2);f.query();assert.equal(f.calls(),3);
});
for(const reason of ['unproven','no-complete-native-component-certificate','native-service-origin-unproven','native-service-component-unproven','timeout'])test(`absence of proof is recomputed: ${reason}`,()=>{
 const f=fixture(reason);f.query();f.query();assert.equal(f.calls(),2);
});
for(const [name,edit] of [
 ['crop removed',f=>f.state.plants[0].alive=false],
 ['crop moved',f=>f.state.plants[0].x++],
 ['crop added',f=>f.state.plants.push({id:'other',alive:true,x:1,z:2})],
 ['wall changed',f=>f.state.structures[0].hp--],
 ['geometry epoch',f=>f.view.version++],
 ['proposed wall',f=>f.plan.pieces.push({x:3,z:4})],
 ['bounds',f=>f.bounds[0]--],
 ['outline',f=>f.outline[0][0]--],
 ['terrain provider',f=>f.view.field.height=()=>1],
 ['navigation provider',f=>f.view.walkable=()=>false],
 ['suppression',f=>f.state.suppressed.push('tree')]
])test(`open witness invalidates on ${name}`,()=>{const f=fixture();f.query();edit(f);f.query();assert.equal(f.calls(),2);});

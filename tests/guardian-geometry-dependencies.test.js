import test from 'node:test';
import assert from 'node:assert/strict';
import {guardianGeometryDependencies,guardianManifestRevision} from '../src/simulation/guardian-geometry-dependencies.js';

const fixture=()=>({culture:'mapungubwe',villages:[{id:'v',culture:'mapungubwe',buildings:[{key:'house',x:1,z:2,yaw:0}]}],structures:[{id:'c',kind:'center',x:3,z:4,yaw:0,status:'intact',hp:100,maxHp:100}],plants:[],raid:{animals:[]}});
const manifest={epoch:'e',chunks:[{cx:0,cz:0,revision:1}]};
const stamp=(state,m=manifest)=>guardianGeometryDependencies(state,guardianManifestRevision(m));

test('building geometry dependencies ignore actor and crop ticks, but track building and terrain changes',()=>{
 const state=fixture(),base=stamp(state);assert.ok(base);state.raid.animals.push({id:'animal',x:20,z:20});state.plants.push({id:'crop',growth:2});assert.deepEqual(stamp(state),base);
 for(const mutate of [s=>s.villages[0].buildings[0].key='new',s=>s.villages[0].buildings[0].x++,s=>s.villages[0].culture='new',s=>s.structures[0].yaw=1,s=>s.structures[0].hp=20,s=>s.structures[0].status='ruined',s=>s.structures[0].culture='new',s=>s.structures.push({...s.structures[0],id:'c2'})]){const copy=fixture();mutate(copy);assert.notDeepEqual(stamp(copy),base);}
 assert.notDeepEqual(stamp(state,{epoch:'e',chunks:[{cx:0,cz:0,revision:2}]}),base);assert.notDeepEqual(stamp(state,{epoch:'new',chunks:[{cx:0,cz:0,revision:1}]}),base);assert.equal(stamp(state,{epoch:'e',chunks:[]}),null);
});

test('manifest rejects duplicate or invalid revisions and tracks only occupied chunks',()=>{
 assert.equal(guardianManifestRevision({epoch:'e',chunks:[{cx:0,cz:0,revision:1},{cx:0,cz:0,revision:1}]}),null);
 assert.equal(guardianManifestRevision({epoch:'e',chunks:[{cx:0,cz:0,revision:0}]}),null);
 assert.deepEqual(stamp(fixture(),{epoch:'e',chunks:[...manifest.chunks,{cx:5,cz:5,revision:50}]}),stamp(fixture()));
});

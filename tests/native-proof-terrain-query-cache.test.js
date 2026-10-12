import test from 'node:test';import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {withNativeProofTerrainQueryCache} from '../tools/native-proof-terrain-query-cache.mjs';
import {serialize} from '../src/persistence/snapshots.js';
function fixture(){return createOpeningWorld({seed:123});}
test('exact native terrain outputs and sweep peaks replay without patching main or state',()=>{
 const {s,nav}=fixture(),source=nav.terrainValid,before=serialize(s),point=[88.25,1.25,.9,false,false];nav.workerSweep={peak:0};const valid=source.apply(nav,point),peak=nav.workerSweep.peak;delete nav.workerSweep;let stats,escaped;
 withNativeProofTerrainQueryCache(nav,v=>{escaped=v;v.workerSweep={peak:0};assert.equal(v.terrainValid(...point),valid);assert.equal(v.workerSweep.peak,peak);v.workerSweep={peak:0};assert.equal(v.terrainValid(...point),valid);assert.equal(v.workerSweep.peak,peak);},{enabled:true,onDiagnostics:r=>stats=r});
 assert.equal(stats.hits,1);assert.equal(stats.misses,1);assert.equal(nav.terrainValid,source);assert.equal(serialize(s),before);assert.equal(escaped.terrainValid(...point),source.apply(nav,point));
});
test('epoch and field-method changes invalidate rather than adopting stale terrain validity',()=>{
 const {nav}=fixture();let stats;withNativeProofTerrainQueryCache(nav,v=>{v.terrainValid(88.25,1.25,.9,false,false);nav.version++;v.terrainValid(88.25,1.25,.9,false,false);nav.field.slope=()=>.8;assert.equal(v.terrainValid(88.25,1.25,.9,false,false),false);},{enabled:true,onDiagnostics:r=>stats=r});assert.equal(stats.invalidations,2);assert.equal(stats.bypassed,1);assert.equal(stats.hits,0);
});
test('cache stays bounded and flags/radii remain distinct inputs',()=>{
 const {nav}=fixture();let stats;withNativeProofTerrainQueryCache(nav,v=>{for(let i=0;i<8;i++)v.terrainValid(88.25+i/4,1.25,.9,false,false);v.terrainValid(88.25,1.25,.9,true,false);v.terrainValid(88.25,1.25,.9,true,true);v.terrainValid(88.25,1.25,.85,true,true);},{enabled:true,limit:4,onDiagnostics:r=>stats=r});assert.equal(stats.peakEntries,4);assert.equal(stats.entries,4);assert.equal(stats.hits,0);
});
test('non-native adapters bypass and default OFF retains original query object',()=>{
 const view={version:1,terrainValid:()=>true,field:{}},source=view.terrainValid;let stats;withNativeProofTerrainQueryCache(view,v=>{assert.equal(v.terrainValid(0,0),true);assert.equal(v.terrainValid(0,0),true);},{enabled:true,onDiagnostics:r=>stats=r});assert.equal(stats.bypassed,2);assert.equal(stats.entries,0);withNativeProofTerrainQueryCache(view,v=>assert.equal(v,view));assert.equal(view.terrainValid,source);
});

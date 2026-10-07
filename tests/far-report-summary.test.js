import test from 'node:test';
import assert from 'node:assert/strict';
import {compactFarReport,farConfiguredNear} from './browser/far-report-summary.js';

test('QA display omits detailed arrays but retains every descent counter and explicit failure',()=>{
 const audit={observations:40,descents:7,offscreenBoundsDescents:4,potentiallyVisibleDescents:2,unknownDescents:1,drops:[{id:'a'},{id:'b'}],nonOffscreenDrops:[{id:'a'}],omissions:[{id:'c'}]};
 const motion={age:20,snapshot:'exact state',allNear:audit,nearReadinessDrops:1,transitionReadinessDrops:[{id:'a'}],unchanged:false};
 const input={loaded:true,errors:['bad'],motion,sequence:{done:true,index:1,queue:[{}],targets:{0:'a'},results:[{slot:0,motion,webglError:1282,errors:['bad']}]}};
 const original=JSON.stringify(input),out=compactFarReport(input);
 assert.equal(JSON.stringify(input),original);assert.equal(out.motion.unchanged,false);assert.equal(out.motion.nearReadinessDrops,1);assert.equal(out.motion.transitionReadinessDropCount,1);assert.equal(out.motion.allNear.descents,7);assert.equal(out.motion.allNear.potentiallyVisibleDescents,2);assert.equal(out.motion.allNear.unknownDescents,1);assert.equal(out.motion.allNear.detailedDropCount,2);assert.equal(out.motion.allNear.omissionCount,1);assert.equal(out.motion.snapshot,undefined);assert.equal(out.motion.allNear.drops,undefined);assert.equal(out.sequence.results[0].webglError,1282);assert.deepEqual(out.errors,['bad']);assert.equal(input.motion.allNear.drops[0].id,'a');
});

test('QA report supports idle and incomplete sequence without adding graphics or changing source objects',()=>{
 const idle={motion:null,sequence:null,camera:[1,2,3],errors:[]};assert.equal(compactFarReport(idle).motion,null);assert.deepEqual(compactFarReport(idle).camera,[1,2,3]);
 const input={motion:{age:1,allNear:{descents:0}},sequence:{results:[{error:'No eligible tree'}],index:0,done:false}};const out=compactFarReport(input);assert.equal(out.sequence.results[0].error,'No eligible tree');assert.equal(out.motion.allNear.detailedDropCount,0);assert.equal(out.sequence.done,false);
});

test('selected-species audit also projects counts without duplicating full drop traces',()=>{const audit={observations:50,descents:3,offscreenBoundsDescents:2,potentiallyVisibleDescents:1,unknownDescents:0,drops:[{id:'a'},{id:'b'},{id:'c'}],nonOffscreenDrops:[{id:'b'}],omissions:[]},input={motion:{selectedSpeciesNear:audit},sequence:{results:[{motion:{selectedSpeciesNear:audit}}]}};const out=compactFarReport(input);assert.equal(out.motion.selectedSpeciesNear.descents,3);assert.equal(out.motion.selectedSpeciesNear.potentiallyVisibleDescents,1);assert.equal(out.motion.selectedSpeciesNear.detailedDropCount,3);assert.equal(out.motion.selectedSpeciesNear.drops,undefined);assert.equal(out.sequence.results[0].motion.selectedSpeciesNear.nonOffscreenDropCount,1);assert.equal(input.motion.selectedSpeciesNear.drops.length,3);});

test('completed fixture routes do not serialize their nested speciesAudit in the compact panel',()=>{
 const audit={observations:80,descents:2,offscreenBoundsDescents:1,potentiallyVisibleDescents:1,unknownDescents:0,drops:[{diagnosis:'x'.repeat(100000)},{id:'b'}],nonOffscreenDrops:[{id:'a'}],omissions:[]};
 const input={sequence:{index:1,done:false,results:[{slot:2,motion:{done:true,age:20,speciesAudit:{stats:audit},transitionReadinessDrops:[{id:'a'}],unchanged:true},errors:[],webglError:0}]}};
 const before=JSON.stringify(input),out=compactFarReport(input),route=out.sequence.results[0].motion;
 assert.equal(route.speciesAudit,undefined);assert.equal(route.selectedSpeciesNear.potentiallyVisibleDescents,1);assert.equal(route.selectedSpeciesNear.detailedDropCount,2);assert.equal(route.transitionReadinessDropCount,1);assert.equal(route.unchanged,true);assert.ok(JSON.stringify(out).length<2000);assert.equal(JSON.stringify(input),before);
});


test('timing display retains totals without repeatedly serializing full draw and transform traces',()=>{
 const submissionState={draws:[{matrix:new Array(16).fill(1)}],breakdown:{totals:{calls:1,triangles:2},rows:[{pass:'screen',calls:1}],objects:[{name:'expensive'}]},limit:'CPU only'},input={submissionState,benchmark:{lots:[{enabled:true,cpu:{p50:1},submissionState,drawContext:{chunks:['a']}}]}};
 const original=JSON.stringify(input),out=compactFarReport(input);assert.equal(JSON.stringify(input),original);assert.equal(out.submissionState.drawCount,1);assert.equal(out.submissionState.draws,undefined);assert.deepEqual(out.benchmark.lots[0].submissionState.totals,{calls:1,triangles:2});assert.equal(out.benchmark.lots[0].drawContext,undefined);assert.equal(out.benchmark.lots[0].cpu.p50,1);
});

test('QA range receipt survives owner disposal after a quality change',()=>{const adapters=[{layer:{options:{start:120,end:160}}}],owner={adapters},fallback={start:90,end:120};assert.deepEqual(farConfiguredNear(owner,fallback),[120,160]);adapters.length=0;assert.deepEqual(farConfiguredNear(owner,fallback),[90,120]);assert.deepEqual(adapters,[]);});

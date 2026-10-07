import test from 'node:test';
import assert from 'node:assert/strict';
import {compactFarReport} from './browser/far-report-summary.js';

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

import test from 'node:test';import assert from 'node:assert/strict';
import {createNearReadinessAudit} from '../tools/experiments/far-near-readiness-audit.js';
test('near audit catches unselected species regression and omission but ignores a tree the camera left',()=>{
 const tree={id:'other-species',x:0,z:0};let ready=1;const adapter={layer:{current:{trees:[tree],prototype:{treeState:()=>({ready})}}},readinessDiagnosis:()=>({coverage:false})},audit=createNearReadinessAudit();
 audit.sample([adapter],{x:0,z:0},0);ready=0;audit.sample([adapter],{x:0,z:0},1);assert.equal(audit.stats.drops[0].id,tree.id);assert.equal(audit.stats.readyObservations,1);
 adapter.layer.current.trees=[];audit.sample([adapter],{x:0,z:0},2);assert.equal(audit.stats.omissions.length,1);
 adapter.layer.current.trees=[tree];audit.sample([adapter],{x:0,z:0},3);audit.sample([adapter],{x:41,z:0},4);assert.equal(audit.stats.omissions.length,1);
});
test('initial loading is counted without inventing a descent, and trace storage is bounded',()=>{
 let ready=0;const adapter={layer:{current:{trees:[{id:'a',x:0,z:0}],prototype:{treeState:()=>({ready})}}},readinessDiagnosis:()=>null},audit=createNearReadinessAudit({maxDrops:2});
 audit.sample([adapter],{x:0,z:0},0);assert.equal(audit.stats.drops.length,0);
 for(let i=1;i<12;i++){ready=i%2;audit.sample([adapter],{x:0,z:0},i);}assert.equal(audit.stats.drops.length,2);assert.equal(audit.stats.observations,12);
});


test('global descent counters continue beyond capped traces and preserve potentially visible failures separately',()=>{
 let ready=1,physical=[{frustum:false}];const adapter={layer:{current:{trees:[{id:'a',x:0,z:0}],prototype:{treeState:()=>({ready})}}},readinessDiagnosis:()=>({physical})},audit=createNearReadinessAudit({maxDrops:1});
 audit.sample([adapter],{x:0,z:0},0);
 for(let i=1;i<=3;i++){ready=0;audit.sample([adapter],{x:0,z:0},i*2);ready=1;audit.sample([adapter],{x:0,z:0},i*2+1);}
 physical=[{frustum:true}];ready=0;audit.sample([adapter],{x:0,z:0},8);ready=1;audit.sample([adapter],{x:0,z:0},9);physical=[];ready=0;audit.sample([adapter],{x:0,z:0},10);
 assert.equal(audit.stats.descents,5);assert.equal(audit.stats.offscreenBoundsDescents,3);assert.equal(audit.stats.potentiallyVisibleDescents,1);assert.equal(audit.stats.unknownDescents,1);assert.equal(audit.stats.drops.length,1);assert.equal(audit.stats.drops[0].classification,'offscreen-bounds');assert.equal(audit.stats.nonOffscreenDrops.length,1);assert.equal(audit.stats.nonOffscreenDrops[0].classification,'potentially-visible');
});

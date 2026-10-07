import test from 'node:test';
import assert from 'node:assert/strict';
import {setFarGroundVisibility} from './browser/far-ground-visibility.js';
const wrap=children=>({layer:{current:{prototype:{impostors:{children}}}}});
test('QA isolation hides both simple and mapped ground, preserving water/trees/backdrop',()=>{
 const simple={userData:{farGround:true},visible:true},mapped={userData:{farGround:true},geometry:{attributes:{aFarWater:{}}},visible:true},tree={userData:{},visible:true},unrelatedWater={geometry:{attributes:{aFarWater:{}}},visible:true};
 assert.equal(setFarGroundVisibility([wrap([simple,mapped,tree,unrelatedWater]),{layer:{current:null}}],false),2);
 assert.equal(simple.visible,false);assert.equal(mapped.visible,false);assert.equal(tree.visible,true);assert.equal(unrelatedWater.visible,true);
 assert.equal(setFarGroundVisibility([wrap([simple,mapped])],true),2);assert.equal(simple.visible,true);assert.equal(mapped.visible,true);
});
test('QA isolation applies to a newly adopted regional ground while hidden',()=>{
 const ground={userData:{farGround:true},visible:true},adapter=wrap([]);
 setFarGroundVisibility([adapter],false);adapter.layer.current.prototype.impostors.children.push(ground);
 assert.equal(setFarGroundVisibility([adapter],false),1);assert.equal(ground.visible,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {guardianPropVolumes} from '../src/rendering/guardian-prop-volumes.js';

test('strict prop planning requires native coverage and complete authored bounds',()=>{
 const target={x:0,z:0},prop={id:'p',slot:0,x:1,z:2},asset={min:[-1,0,-1],max:[1,3,1]},nav={field:{surface:()=>4},propsAt:()=>[prop]};
 assert.deepEqual(guardianPropVolumes(nav,[asset],target,{strict:true}),guardianPropVolumes(nav,[asset],target));
 assert.throws(()=>guardianPropVolumes(nav,[],target,{strict:true}),/bounds unavailable/);
 assert.throws(()=>guardianPropVolumes({...nav,propsAt:()=>null},[asset],target,{strict:true}),/coverage unavailable/);
 const missing=Object.assign(Error('missing chunk'),{name:'SpatialChunkUnavailable'});assert.throws(()=>guardianPropVolumes({...nav,propsAt:()=>{throw missing;}},[asset],target,{strict:true}),error=>error===missing);
});

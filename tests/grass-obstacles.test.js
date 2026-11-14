import test from 'node:test';
import assert from 'node:assert/strict';
import {indexGrassObstacles} from '../src/rendering/grass-obstacles.js';
import {generateGrassTile} from '../src/rendering/grass-tile-generation.js';

test('confirmed obstacles and live crops exclude grass without consulting navigation',()=>{
 const obstacles=[{kind:'shield',x:4,z:4,radius:20},{footprint:[{x:1,z:1},{x:7,z:1},{x:7,z:7},{x:1,z:7}]}],plants=[{x:0,z:0,alive:true},{x:100,z:100,alive:false}],buckets=indexGrassObstacles(obstacles,plants,.6);
 assert.ok(buckets.get('0,0').some(o=>o.polygon));assert.ok(buckets.get('0,0').some(o=>o.r===1.6));assert.equal(buckets.has('12,12'),false);assert.equal(buckets.get('0,0').some(o=>o.r===20),false);
 const chunk={cx:0,cz:0,h:new Float32Array(49*49),mask:{data:new Uint8Array(35*35*4)}};for(let i=0;i<chunk.mask.data.length;i+=4)chunk.mask.data.set([255,128,255,0],i);
 const base={spacing:.5,seed:123,varied:false,river:false,mangrove:false,fern:false,edgePadding:.6,nearWater:()=>false};const clear=generateGrassTile(chunk,0,0,{...base,blockers:new Map(),stats:{candidates:0,masked:0}}),blocked=generateGrassTile(chunk,0,0,{...base,blockers:buckets,stats:{candidates:0,masked:0}});assert.ok(blocked.items.length<clear.items.length);assert.ok(blocked.items.length>0);
});

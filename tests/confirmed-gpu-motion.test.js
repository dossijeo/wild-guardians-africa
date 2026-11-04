import test from 'node:test';
import assert from 'node:assert/strict';
import {uniform} from 'three/tsl';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {createConfirmedGpuMotion} from '../src/rendering/confirmed-gpu-motion.js';
const trace=()=>({actorId:'a',continuous:true,timed:true,start:{at:5,x:0,z:0},end:{at:7,x:2,z:1},segments:[{t0:5,t1:6,x0:0,z0:0,x1:1,z1:0},{t0:6.5,t1:7,x0:1,z0:0,x1:2,z1:1}]});
test('installs only ordered continuous confirmed traces and preserves data on rejection',()=>{
 const motion=createConfirmedGpuMotion({actorId:'a',clock:uniform(0),maxSegments:2});motion.install(trace(),1);const old=motion.texture.image.data.slice();assert.equal(motion.status().installed.segments,2);
 motion.hold(5.5);assert.equal(motion.status().horizon,5.5);assert.throws(()=>motion.hold(6),/hold/);assert.throws(()=>motion.install(trace(),1),/Stale/);const broken=trace();broken.segments[1].x0=8;assert.throws(()=>motion.install(broken,2),/segment/);assert.deepEqual(motion.texture.image.data,old);assert.equal(motion.status().sequence,1);
 const unsafe=trace();unsafe.timed=false;assert.throws(()=>motion.install(unsafe,2),/Unusable/);motion.dispose();assert.throws(()=>motion.install(trace(),2),/disposed/);
});
test('refuses incompatible materials and oversized paths',()=>{
 const motion=createConfirmedGpuMotion({actorId:'a',clock:uniform(0),maxSegments:1});assert.throws(()=>motion.install(trace(),1),/Unusable/);assert.throws(()=>motion.bind({}),/node material/);const material=new MeshBasicNodeMaterial();motion.bind(material);assert.ok(material.positionNode);assert.throws(()=>motion.bind(material),/node material/);motion.dispose();assert.equal(material.positionNode,null);material.dispose();
});

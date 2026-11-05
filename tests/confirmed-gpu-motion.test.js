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
 const motion=createConfirmedGpuMotion({actorId:'a',clock:uniform(0),maxSegments:1});assert.throws(()=>motion.install(trace(),1),/Unusable/);assert.throws(()=>motion.bind({}),/node material/);const material=new MeshBasicNodeMaterial();motion.bind(material);assert.ok(material.positionNode);assert.equal(motion.bind(material),material);motion.dispose();assert.equal(material.positionNode,null);material.dispose();
});

test('composes and restores existing position nodes while rejecting conflicting owners and shadow positions',()=>{const first=createConfirmedGpuMotion({actorId:'a',clock:uniform(0)}),second=createConfirmedGpuMotion({actorId:'b',clock:uniform(0)}),material=new MeshBasicNodeMaterial(),original=uniform(1);material.positionNode=original;first.bind(material);assert.notEqual(material.positionNode,original);assert.throws(()=>second.bind(material),/already owned/);first.unbind(material);assert.equal(material.positionNode,original);material.castShadowPositionNode=original;assert.throws(()=>first.bind(material),/compatible/);first.dispose();second.dispose();material.dispose();});

test('samples the same clamped confirmed path used by GPU and honors holds',()=>{const m=createConfirmedGpuMotion({actorId:'a',clock:uniform(0),maxSegments:2});m.install(trace(),1);assert.deepEqual(m.sample(4),{x:0,z:0,dx:0,dz:0});assert.deepEqual(m.sample(5.5),{x:.5,z:0,dx:.5,dz:0});assert.deepEqual(m.sample(6.25),{x:1,z:0,dx:1,dz:0});m.hold(5.5);assert.deepEqual(m.sample(9),{x:.5,z:0,dx:.5,dz:0});m.dispose();assert.throws(()=>m.sample(5),/sample/);});

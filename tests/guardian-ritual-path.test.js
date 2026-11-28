import test from 'node:test';import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';import {planRitualArc} from '../src/rendering/guardian-ritual-path.js';
const setup=()=>{const c=new PerspectiveCamera(50,16/9,.1,100);c.position.set(3,12,18);c.lookAt(3,0,0);return c;};
test('clear paths preserve the existing spiral',()=>assert.deepEqual(planRitualArc({x:0,y:3,z:0},{x:6,y:0,z:0},setup(),()=>false),{x:0,y:0,z:0,cost:0}));
test('paths leave a central obstruction without moving endpoints',()=>{const p=planRitualArc({x:0,y:3,z:0},{x:6,y:0,z:0},setup(),(_a,b)=>b[0]>2&&b[0]<4&&Math.abs(b[2])<1&&b[1]<3);assert.ok(p);assert.ok(p.y>0||Math.abs(p.z)>0);});
test('fully blocked routes fail with bounded work',()=>{let n=0;assert.equal(planRitualArc({x:0,y:3,z:0},{x:6,y:0,z:0},setup(),()=>{n++;return true;}),null);assert.ok(n<=44);});
test('offscreen routes are rejected before collision checks',()=>{const c=setup();c.lookAt(0,12,100);assert.equal(planRitualArc({x:0,y:3,z:0},{x:6,y:0,z:0},c,()=>false),null);});

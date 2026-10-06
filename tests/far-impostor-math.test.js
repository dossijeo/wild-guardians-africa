import test from 'node:test';import assert from 'node:assert/strict';import {atlasViews,lodMix,modelOrigin,billboardRight,NearTreeSelection} from '../tools/experiments/far-impostor-math.js';
test('cylindrical billboard ignores camera height and remains perpendicular to the horizontal view',()=>{const base={x:3,y:0,z:4};for(const y of [-100,0,100]){const camera={x:13,y,z:14},right=billboardRight(camera,base);assert.equal(right.y,0);assert.ok(Math.abs(Math.hypot(right.x,right.z)-1)<1e-12);assert.ok(Math.abs(right.x*10+right.z*10)<1e-12);}});
test('atlas preserves tree rotation, interpolates neighbouring views and wraps through zero',()=>{const base={x:0,z:0},camera={x:Math.sin(Math.PI/6),z:Math.cos(Math.PI/6)},a=atlasViews(camera,base,0);assert.equal(a.first,0);assert.equal(a.second,1);assert.ok(Math.abs(a.blend-2/3)<1e-12);const rotated=atlasViews(camera,base,Math.PI/4);assert.equal(rotated.first,7);assert.equal(rotated.second,0);assert.ok(Math.abs(rotated.blend-2/3)<1e-12);assert.deepEqual(atlasViews(camera,base,Math.PI/4+Math.PI*2),rotated);});
test('model anchor transforms to the identical billboard base at every procedural rotation and scale',()=>{const base={x:35,y:7,z:-91},local=[.0515078306,0,1.27623853];for(let i=0;i<8;i++)for(const scale of [.7,1,1.2]){const yaw=i*Math.PI/4,o=modelOrigin(base,local,yaw,scale),c=Math.cos(yaw),s=Math.sin(yaw);assert.ok(Math.abs(o.x+(local[0]*c+local[2]*s)*scale-base.x)<1e-10);assert.ok(Math.abs(o.y+local[1]*scale-base.y)<1e-10);assert.ok(Math.abs(o.z+(-local[0]*s+local[2]*c)*scale-base.z)<1e-10);}});
test('bidirectional LOD retains impostor until model readiness and ramps in late models',()=>{assert.equal(lodMix(25,40,60,1),0);assert.equal(lodMix(50,40,60,1),.5);assert.equal(lodMix(100,40,60,1),1);assert.equal(lodMix(25,40,60,0),1);assert.equal(lodMix(25,40,60,.5),.5);assert.throws(()=>lodMix(50,60,40),/Transition/);});

test('near selection reuses quiet-camera results, excludes the far field, and invalidates geometry/readiness changes',()=>{
 const trees=[{x:0,z:0},{x:60,z:0},...Array.from({length:1000},(_,i)=>({x:i,z:-200}))],selection=new NearTreeSelection(trees);
 assert.equal(selection.update(0,0,60,true),true);assert.deepEqual(selection.indices,[0]);const original=selection.indices;
 for(let i=0;i<180;i++)assert.equal(selection.update(0,0,60,true),false);assert.equal(selection.scans,1);assert.equal(selection.indices,original);
 assert.equal(selection.update(5,0,60,true),true);assert.deepEqual(selection.indices,[0,1]);
 assert.equal(selection.update(5,0,60,false),true);assert.deepEqual(selection.indices,[]);
 assert.equal(selection.update(5,0,60,true),true);trees[0].x=100;assert.equal(selection.update(5,0,60,true,1),true);assert.deepEqual(selection.indices,[1]);
 trees[1].x=10;assert.equal(selection.update(5,0,60,true,2),true);assert.deepEqual(selection.indices,[1]);assert.equal(selection.update(5,0,60,true,2),false);
});

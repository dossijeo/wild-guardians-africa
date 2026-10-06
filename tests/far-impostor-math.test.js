import * as THREE from 'three';
import test from 'node:test';import assert from 'node:assert/strict';import {atlasViews,lodMix,modelOrigin,billboardRight,NearTreeSelection,treeDensityRank,farDensityFade} from '../tools/experiments/far-impostor-math.js';
test('far density preserves all faithful objects and converges smoothly and deterministically on approach',()=>{
 const ranks=Array.from({length:10000},(_,i)=>treeDensityRank('tree-'+i,712));
 assert.deepEqual(ranks,Array.from({length:10000},(_,i)=>treeDensityRank('tree-'+i,712)));
 assert.notEqual(ranks[0],treeDensityRank('tree-0',713));
 let distant=0;
 for(const rank of ranks){
  assert.ok(rank>=0&&rank<1);assert.equal(farDensityFade(100,rank),1);
  let previous=0;
  for(let distance=260;distance>=80;distance-=1){const fade=farDensityFade(distance,rank);assert.ok(fade>=previous);assert.ok(fade>=0&&fade<=1);previous=fade;}
  distant+=farDensityFade(240,rank);
 }
 assert.ok(distant>1400&&distant<2000,`Expected sparse far landscape, got equivalent coverage ${distant}`);
 const options={start:100,end:240,minimum:.15,band:.04};
 for(const rank of [.2,.4,.7,.95])for(let d=100;d<240;d+=.25)assert.ok(Math.abs(farDensityFade(d+.01,rank,options)-farDensityFade(d,rank,options))<.003);
 assert.equal(farDensityFade(300,.99,{minimum:1}),1);assert.throws(()=>farDensityFade(200,.5,{end:50}),/Invalid/);
});
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

test('anisotropic atlas angle agrees with inverse native model transform and screen projection',()=>{
 const base={x:7,z:-9,sx:.8,sy:1.15,sz:1.25},camera={x:0,z:0};
 for(const views of [8,16])for(let i=0;i<64;i++)for(const yaw of [0,.3,Math.PI/2,Math.PI]){
  const azimuth=i*Math.PI/32;camera.x=base.x+Math.sin(azimuth)*70;camera.z=base.z+Math.cos(azimuth)*70;
  const native=new THREE.Matrix4().compose(new THREE.Vector3(),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(base.sx,base.sy,base.sz));
  const local=new THREE.Vector3(camera.x-base.x,0,camera.z-base.z).applyMatrix4(native.clone().invert());
  const expected=((Math.atan2(local.x,local.z)%(2*Math.PI))+2*Math.PI)%(2*Math.PI),actual=atlasViews(camera,base,yaw,views);
  const angle=(actual.first+actual.blend)*2*Math.PI/views;
  assert.ok(Math.abs(Math.atan2(Math.sin(angle-expected),Math.cos(angle-expected)))<1e-12);
  const point=new THREE.Vector3(2,0,-3),world=point.clone().applyMatrix4(native),screenRight=new THREE.Vector3(Math.cos(azimuth),0,-Math.sin(azimuth));
  const r=azimuth-yaw,width=Math.hypot(Math.cos(r)*base.sx,Math.sin(r)*base.sz);
  assert.ok(Math.abs(world.dot(screenRight)-width*(Math.cos(angle)*point.x-Math.sin(angle)*point.z))<1e-12);
 }
 assert.notDeepEqual(atlasViews({x:50,z:50},base,0),atlasViews({x:50,z:50},{...base,sx:1,sz:1},0));
});
test('fallback model origin preserves the exact native base under anisotropic scales',()=>{
 const base={x:35,y:7,z:-91,sx:.8,sy:1.15,sz:1.25},local=[.0515078306,.12,1.27623853];
 for(let i=0;i<16;i++){
  const yaw=i*Math.PI/8,o=modelOrigin(base,local,yaw,1),matrix=new THREE.Matrix4().compose(new THREE.Vector3(o.x,o.y,o.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(base.sx,base.sy,base.sz)),anchor=new THREE.Vector3(...local).applyMatrix4(matrix);
  assert.ok(anchor.distanceTo(new THREE.Vector3(base.x,base.y,base.z))<1e-12);
 }
});

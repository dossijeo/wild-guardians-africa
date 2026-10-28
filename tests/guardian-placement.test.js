import test from 'node:test';import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';import {guardianPlacement} from '../src/rendering/guardian-placement.js';
function setup(angle=0){const camera=new PerspectiveCamera(42,16/9,.1,500);camera.position.set(12*Math.sin(angle),8,12*Math.cos(angle));camera.lookAt(0,0,0);camera.updateMatrixWorld(true);return {target:{x:0,z:0,radius:1},camera,nav:{field:{surface:()=>0},placement:()=>({valid:true})},state:{plants:[],raid:{animals:[]}}};}
test('placement stays near the target and inside the camera from four angles',()=>{for(const angle of [0,1.5,3,4.5]){const args=setup(angle),p=guardianPlacement(args),screen=new Vector3(p.x,p.y,p.z).project(args.camera);assert.ok(Math.hypot(p.x,p.z)>=3);assert.ok(Math.abs(screen.x)<.9);assert.ok(Math.abs(screen.y)<.9);assert.equal(p.y,1.7);}});
test('placement rejects occupied footprints and prefers a visible alternative',()=>{const args=setup();args.nav.placement=x=>({valid:x>0});const p=guardianPlacement({...args,occluded:x=>x<0});assert.ok(p.x>0);args.state.plants=[{alive:true,x:p.x,z:p.z}];const other=guardianPlacement(args);assert.ok(Math.hypot(other.x-p.x,other.z-p.z)>=1);});
test('all blocked candidates produce a finite elevated fallback without mutating the world',()=>{const args=setup();args.nav.placement=()=>({valid:false});const before=JSON.stringify(args.state),p=guardianPlacement(args);assert.equal(p.y,6.7);assert.ok(Number.isFinite(p.x+p.z));assert.equal(JSON.stringify(args.state),before);});

test('placement leaves space around workers, including incapacitated bodies',()=>{const args=setup(),first=guardianPlacement(args);args.state.workers=[{x:first.x,z:first.z,status:'incapacitated',incapacitated:true}];const moved=guardianPlacement(args);assert.ok(Math.hypot(moved.x-first.x,moved.z-first.z)>=1.1);});

test('large distant farms are rejected once by the placement broad phase',()=>{const args=setup(),expected=guardianPlacement(args);let reads=0;args.state.plants=Array.from({length:10000},()=>({alive:true,get x(){reads++;return 10000;},z:10000}));assert.deepEqual(guardianPlacement(args),expected);assert.equal(reads,10000);});


test('crowded footprints choose an elevated body inside the camera and above crops',()=>{
 const args=setup();args.nav.placement=()=>({valid:false});args.state.plants=[];for(let x=-5;x<=5;x+=.5)for(let z=-5;z<=5;z+=.5)args.state.plants.push({x,z,alive:true});
 const p=guardianPlacement({...args,occupied:x=>x<0,cropHeight:()=>2.5});
 assert.ok(p.x>=0);assert.ok(p.y-1.2>=2.5);assert.ok(p.y<6.7);
 const head=new Vector3(p.x,p.y+1.3,p.z).project(args.camera);assert.ok(Math.abs(head.y)<.88);
});

// Foliage may be walkable while intersecting or hiding the lower mantle.
test('walkable vegetation still excludes the full body of a normal summon',()=>{
 const args=setup(),first=guardianPlacement(args);
 const next=guardianPlacement({...args,occupied:(x,y,z)=>Math.hypot(x-first.x,z-first.z)<.2});
 assert.ok(Math.hypot(next.x-first.x,next.z-first.z)>.2);assert.equal(next.y,1.7);
});
test('visibility checks the lower mantle even when the face remains visible',()=>{
 const args=setup(),first=guardianPlacement(args);let checks=0;
 const next=guardianPlacement({...args,occluded:(x,y,z)=>{checks++;return y<1.2&&Math.hypot(x-first.x,z-first.z)<.2;}});
 assert.ok(Math.hypot(next.x-first.x,next.z-first.z)>.2);assert.equal(checks,48);
});

test("spirit placement never asks native navigation for an invented animal profile",()=>{const args=setup();args.nav.walkable=()=>{throw Error("Unsupported animal radius");};assert.ok(guardianPlacement(args));});

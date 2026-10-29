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
 assert.ok(Math.hypot(next.x-first.x,next.z-first.z)>.2);assert.ok(checks>=10&&checks<=80);
});

test('clear best candidate prunes visibility rays for candidates that cannot win',()=>{
 const args=setup();let calls=0;
 guardianPlacement({...args,occluded:()=>{calls++;return false;}});
 assert.ok(calls>=5&&calls<80,`Expected bounded pruning, got ${calls} rays`);
});

test('placement avoids a building masking only the lateral silhouette',()=>{
 const args=setup(),first=guardianPlacement(args);
 const edge={x:first.x+.8,z:first.z};let seen=false;
 const next=guardianPlacement({...args,occluded:(x,y,z)=>{
  const blocked=Math.hypot(x-edge.x,z-edge.z)<.05&&Math.abs(y-first.y)<.05;
  seen ||= blocked;return blocked;
 }});
 assert.equal(seen,true,'The body side must be sampled even with a clear center');
 assert.ok(Math.hypot(next.x-first.x,next.z-first.z)>.2);
});

test("spirit placement never asks native navigation for an invented animal profile",()=>{const args=setup();args.nav.walkable=()=>{throw Error("Unsupported animal radius");};assert.ok(guardianPlacement(args));});


test('placement projects with the current camera after a same-frame turn',()=>{
 const args=setup(),camera=args.camera;
 camera.position.set(-12,8,1);camera.lookAt(0,0,0);
 const beforeRender=guardianPlacement(args);
 camera.updateMatrixWorld(true);
 const afterRender=guardianPlacement(args);
 assert.deepEqual(beforeRender,afterRender,'A render must not change the placement decision');
});


test('edge targets leave room for the mantle and arrival vortex',()=>{
 const args=setup();args.target.x=5;
 const p=guardianPlacement(args);
 for(const x of [-1.4,1.4])for(const y of [-1.2,1.4])for(const z of [-1.4,1.4]){
  const screen=new Vector3(p.x+x,p.y+y,p.z+z).project(args.camera);
  assert.ok(Math.abs(screen.x)<1&&Math.abs(screen.y)<1,`Cropped arrival envelope: ${screen.toArray()}`);
 }
});

test('expanded edge search frames the body and excludes distant crops and workers',()=>{
 const args=setup();args.target.z=-12;let checks=0;
 args.nav.placement=()=>{checks++;return {valid:true};};
 const first=guardianPlacement(args);
 assert.equal(checks,26,'The edge case must exercise the ten extra candidates');
 assert.ok(Math.hypot(first.x,first.z-args.target.z)>4.4);
 const framed=p=>{
  for(const dx of [-1.4,1.4])for(const dy of [-1.2,1.4])for(const dz of [-1.4,1.4]){
   const screen=new Vector3(p.x+dx,p.y+dy,p.z+dz).project(args.camera);
   assert.ok(Math.abs(screen.x)<=.92&&Math.abs(screen.y)<=.92,`Cropped expanded candidate: ${screen.toArray()}`);
  }
 };
 framed(first);
 for(const kind of ['crop','worker']){
  // This obstacle lies outside the old nearby-ring broad phase.
  assert.ok(Math.abs(first.z-args.target.z)>args.target.radius+4.5);
  args.state.plants=kind==='crop'?[{x:first.x,z:first.z,alive:true}]:[];
  args.state.workers=kind==='worker'?[{x:first.x,z:first.z,status:'incapacitated'}]:[];
  checks=0;const next=guardianPlacement(args);
  assert.equal(checks,26);assert.equal(next.y,1.7);
  assert.ok(Math.hypot(next.x-first.x,next.z-first.z)>=(kind==='crop'?1:1.1));
  framed(next);
 }
});

test('close perspective views never prefer a projected candidate behind the camera',()=>{
 const args=setup();args.camera.fov=70;args.camera.far=50;args.camera.position.set(0,2,3);args.camera.lookAt(0,1.7,0);args.camera.updateProjectionMatrix();
 const p=guardianPlacement(args);
 for(const dx of [-1.4,1.4])for(const dy of [-1.2,1.4])for(const dz of [-1.4,1.4]){
  const view=new Vector3(p.x+dx,p.y+dy,p.z+dz).applyMatrix4(args.camera.matrixWorldInverse);
  assert.ok(-view.z>=args.camera.near&&-view.z<=args.camera.far,`Invisible body corner: ${view.toArray()}`);
 }
});

test('ritual prefers hovering above an unobstructed target and falls back when the aerial volume is blocked',()=>{
 const args=setup();args.camera.position.set(12,14,16);args.camera.lookAt(0,2,0);args.camera.updateMatrixWorld(true);args.target.kind='wall';
 const p=guardianPlacement({...args,hoverAbove:true});assert.equal(p.x,0);assert.equal(p.z,0);assert.equal(p.y,4.2);
 const fallback=guardianPlacement({...args,hoverAbove:true,occupied:(x,y,z)=>Math.hypot(x,z)<1});assert.ok(Math.hypot(fallback.x,fallback.z)>1);
});


test('seedling ritual clears nearby wall tops even when the wall is behind the spirit',()=>{
 const args=setup();args.camera.position.set(12,14,16);args.camera.lookAt(0,2,0);args.camera.updateMatrixWorld(true);
 args.target.species='mijo';args.state.structures=[{kind:'wall',status:'intact',x:0,z:-2}];
 const p=guardianPlacement({...args,hoverAbove:true,cropHeight:()=>.15});
 assert.equal(p.x,0);assert.equal(p.z,0);assert.equal(p.y,4.2);
 args.state.structures[0].status='destroyed';
 assert.ok(Math.abs(guardianPlacement({...args,hoverAbove:true,cropHeight:()=>.15}).y-1.85)<1e-9);
});

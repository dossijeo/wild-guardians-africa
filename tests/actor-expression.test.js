import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BufferGeometry,Float32BufferAttribute,MeshBasicMaterial} from 'three';
import {ActorExpression,expressionTargets} from '../src/rendering/actor-expression.js';
const target=(entity,kind,time)=>expressionTargets(entity,kind,time,.3,new Float64Array(3));
test('farmers only open their mouth during flight or a physical hit',()=>{
 for(const status of ['idle','walking','arriving','returning','carrying','acting','home','incapacitated'])assert.equal(target({status},'worker',12)[2],0,status);
 assert.ok(target({status:'fleeing'},'worker',12)[2]>.3);assert.ok(target({status:'walking',fallRemaining:.5},'worker',12)[2]>.7);
});
test('beast pain starts at visual contact and attack mouths obey animation phase',()=>{
 const beast={magicImpact:{at:10,impactAt:10.24}};
 assert.equal(target(beast,'animal',10.2)[2],0);assert.equal(target(beast,'animal',10.24)[2],.85);assert.equal(target(beast,'animal',11)[2],0);
 assert.ok(target({status:'attacking',attackDuration:2,attackRemaining:1},'animal',12)[2]>.6);
 assert.equal(target({status:'attacking',attackDuration:2,attackRemaining:1,magicDown:{phase:'falling'}},'animal',12)[2],0);
});
test('natural blinks close fully, remain bounded and are repeatable by simulation time',()=>{
 let max=0,count=0;for(let t=0;t<10;t+=.005){const a=target({},'animal',t);max=Math.max(max,a[0]);count+=a[0]>.9;for(const w of a)assert.ok(w>=0&&w<=1);assert.deepEqual(a,target({},'animal',t));}assert.ok(max>.99&&count>5);
});
test('all matching morphs update together, pause freezes and reset returns neutral',()=>{
 const model=new Group();for(let i=0;i<2;i++){const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([0,0,0],3));g.morphAttributes.position=[new Float32BufferAttribute([0,1,0],3)];g.morphAttributes.position[0].name='mouthOpen';model.add(new Mesh(g,new MeshBasicMaterial()));}
 const controller=new ActorExpression(model,'farmer');controller.update({status:'fleeing'},'worker',10);const value=model.children[0].morphTargetInfluences[0];assert.ok(value>.3);assert.equal(value,model.children[1].morphTargetInfluences[0]);controller.update({status:'idle'},'worker',10);assert.equal(model.children[0].morphTargetInfluences[0],value);controller.update({status:'idle'},'worker',11);assert.ok(model.children[0].morphTargetInfluences[0]<.00001);controller.update({status:'idle'},'worker',1);assert.equal(model.children[0].morphTargetInfluences[0],0);
});


test('bound eyelid reaches full closure and pauses at the displayed pose',()=>{
 const model=new Group(),geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([0,0,0],3));
 geometry.morphAttributes.position=['blinkL','blinkR','mouthOpen'].map(name=>{const a=new Float32BufferAttribute([0,1,0],3);a.name=name;return a;});
 const mesh=new Mesh(geometry,new MeshBasicMaterial());model.add(mesh);const controller=new ActorExpression(model,'hyena');
 const period=3.4+controller.phase*2,peak=period-controller.phase*period+.07;
 controller.update({},'animal',peak-.04);controller.update({},'animal',peak);
 assert.equal(mesh.morphTargetInfluences[0],1);
 const frozen=[...mesh.morphTargetInfluences];controller.update({magicDown:{phase:'falling'}},'animal',peak);assert.deepEqual(mesh.morphTargetInfluences,frozen);
 controller.update({status:'idle',hits:1},'worker',peak+1);controller.update({status:'incapacitated',hits:2},'worker',peak+1.05);
 assert.ok(mesh.morphTargetInfluences[2]>.5,'a second hit still opens the mouth even without fallRemaining');
 controller.update({status:'incapacitated',hits:2},'worker',peak+2);assert.ok(mesh.morphTargetInfluences[2]<.00001);
 geometry.dispose();mesh.material.dispose();
});


test('corrective eyelids reproduce intermediate poses without additive over-closure',()=>{
 const model=new Group(),geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([0,0,0],3));
 const names=['blinkL25','blinkL50','blinkL75','blinkL','blinkR','mouthOpen'];
 geometry.morphAttributes.position=names.map(name=>{const a=new Float32BufferAttribute([0,1,0],3);a.name=name;return a;});
 const mesh=new Mesh(geometry,new MeshBasicMaterial());model.add(mesh);const controller=new ActorExpression(model,'corrective');
 for(const [value,expected] of [[0,[0,0,0,0]],[.25,[1,0,0,0]],[.375,[.5,.5,0,0]],[.5,[0,1,0,0]],[.875,[0,0,.5,.5]],[1,[0,0,0,1]]]){
  controller.setValues(value,.6,.4);
  assert.deepEqual(mesh.morphTargetInfluences.slice(0,4),expected);
  assert.equal(mesh.morphTargetInfluences[4],.6);assert.equal(mesh.morphTargetInfluences[5],.4);
 }
 for(let i=0;i<=100;i++){
  controller.setValues(i/100,0,0);
  const weights=mesh.morphTargetInfluences.slice(0,4);
  assert.ok(weights.filter(v=>v>0).length<=2);assert.ok(weights.reduce((a,b)=>a+b,0)<=1.000001);
 }
});

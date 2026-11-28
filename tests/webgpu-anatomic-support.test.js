import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone,Group,Mesh,MeshBasicMaterial,PlaneGeometry} from 'three';
import {createAnatomicSupport} from '../src/rendering/webgpu-anatomic-support.js';

test('anatomical support lifts only the visual model with bounded terrain rays',()=>{
 const root=new Group(),model=new Group(),bone=new Bone();bone.name='Hips';bone.position.y=1;model.add(bone);root.add(model);const terrain=new Mesh(new PlaneGeometry(20,20),new MeshBasicMaterial());terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);
 const support=createAnatomicSupport({model,root,residency:{get:()=>terrain},radius:.9,bank:{bones:[{name:'Hips',points:[[0,-1.5,0],[.1,-1.4,0]]}]}}),result=support.apply();
 assert.ok(result.queries<=16);assert.ok(Math.abs(result.lift-.56)<1e-6);assert.equal(root.position.y,0);assert.ok(Math.abs(model.position.y-.56)<1e-6);
 assert.throws(()=>createAnatomicSupport({model,root,residency:{get:()=>terrain},radius:.9,bank:{bones:[{name:'missing',points:[[0,0,0]]}]}}),/rig mismatch/);
 terrain.geometry.dispose();terrain.material.dispose();
});

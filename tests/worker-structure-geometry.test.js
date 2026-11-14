import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,BoxGeometry,Group,Mesh} from 'three';
import {captureStructureTemplate,createWorkerStructureObjects} from '../src/simulation/worker-structure-geometry.js';

test('worker structure geometry reproduces scene bounds under authoritative transforms',()=>{
 const root=new Group();root.userData.nativeBuilding=true;root.scale.setScalar(2);const a=new Mesh(new BoxGeometry(2,3,4)),b=new Mesh(new BoxGeometry(3,1,2));b.position.set(2,1,-1);b.rotation.y=.4;root.add(a,b);
 const template=structuredClone(captureStructureTemplate(root));
 const center={id:'c',kind:'center',status:'intact',culture:'test',x:0,z:0,yaw:0},state={structures:[center]},nav={field:{surface:(x,z)=>x*.1-z*.2}};
 for(const yaw of [0,.31,Math.PI/2,Math.PI]){const worker=createWorkerStructureObjects(state,nav,{test:template});try{center.x=12;center.z=-4;center.yaw=yaw;root.position.set(center.x,nav.field.surface(center.x,center.z)+.025,center.z);root.rotation.y=yaw;root.updateMatrixWorld(true);worker.sync(center);const expected=new Box3().setFromObject(root),actual=new Box3().setFromObject(worker.objects.get('c'));for(const axis of ['x','y','z']){assert.ok(Math.abs(expected.min[axis]-actual.min[axis])<1e-10);assert.ok(Math.abs(expected.max[axis]-actual.max[axis])<1e-10);}center.yaw+=.1;assert.throws(()=>worker.sync(center),/geometry changed/);}finally{worker.dispose();}}
});

test('missing or invalid structure geometry fails closed',()=>{
 const center={id:'c',kind:'center',status:'intact',culture:'missing',x:0,z:0},state={structures:[center]},nav={field:{surface:()=>0}},worker=createWorkerStructureObjects(state,nav,{});
 assert.throws(()=>worker.sync(center),/lacks nearby structure geometry/);worker.dispose();
 const malformed=createWorkerStructureObjects(state,nav,{missing:{version:1,scale:[1,1,1],parts:[{min:[0,0,0],max:[1,1,1],matrix:Array(16).fill(NaN)}]}});
 assert.throws(()=>malformed.sync(center),/Invalid structure template part/);malformed.dispose();
});

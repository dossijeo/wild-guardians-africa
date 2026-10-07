import test from 'node:test';import assert from 'node:assert/strict';import {BoxGeometry,Group,Frustum,Matrix4,PerspectiveCamera} from 'three';
import {nativeTreeDiagnosticBounds} from '../tools/experiments/native-tree-diagnostic-bounds.js';

test('per-tree envelope includes every native variant and exact chunk origin, yaw and anisotropic scale',()=>{
 const group=new Group();group.position.set(96,2,144);const a=new BoxGeometry(2,4,6),b=new BoxGeometry(4,2,2),batch={levels:[{geometry:a},{geometry:b}],chunkOrigin:[96,144]},tree={x:101,y:3,z:151,yaw:Math.PI/2,sx:2,sy:3,sz:4};
 const box=nativeTreeDiagnosticBounds(group,batch,tree);assert.deepEqual(box.min.toArray(),[89,-1,147]);assert.deepEqual(box.max.toArray(),[113,11,155]);a.dispose();b.dispose();
});

test('a chunk may intersect camera while its individual tree envelope does not',()=>{
 const camera=new PerspectiveCamera(45,1,.1,100);camera.updateMatrixWorld();const frustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));const geometry=new BoxGeometry(2,4,2),group=new Group(),batch={levels:[{geometry}],chunkOrigin:[0,0]};
 const visible=nativeTreeDiagnosticBounds(group,batch,{x:0,y:0,z:-10,yaw:0,sx:1,sy:1,sz:1}),hidden=nativeTreeDiagnosticBounds(group,batch,{x:50,y:0,z:-10,yaw:0,sx:1,sy:1,sz:1});assert.equal(frustum.intersectsBox(visible.clone().union(hidden)),true);assert.equal(frustum.intersectsBox(hidden),false);geometry.dispose();
});

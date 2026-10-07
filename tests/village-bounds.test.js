import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Assets} from '../src/rendering/assets.js';
import {cameraModelVolume} from '../src/rendering/camera-model-volume.js';
import {sweepCameraVolume} from '../src/rendering/camera-volume-sweep.js';
const villages=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url)));

test('five village loaders bound every indexed unit without copying or restricting its shared geometry',async t=>{
  t.mock.method(globalThis,'fetch',async url=>{
    const bytes=readFileSync(new URL('../public'+url,import.meta.url));
    return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  });
  const assets=new Assets(),texture=new THREE.Texture();t.mock.method(assets,'texture',async()=>texture);
  let rejectedByUnitOnly=0;
  for(const payload of villages){
    const meshes=await assets.village(payload),wholeBox=new THREE.Box3().setFromBufferAttribute(meshes[0].geometry.attributes.position),wholeSphere=wholeBox.getBoundingSphere(new THREE.Sphere());
    for(const [i,mesh] of meshes.entries()){
      const g=mesh.geometry,unit=payload.units[i],point=new THREE.Vector3();
      assert.equal(g.attributes.position.data,meshes[0].geometry.attributes.position.data);
      assert.equal(g.index.array,meshes[0].geometry.index.array);
      assert.deepEqual(g.drawRange,{start:unit.offset,count:unit.count});
      assert.ok(mesh.frustumCulled&&mesh.castShadow&&mesh.receiveShadow);
      const indexedBox=new THREE.Box3();
      for(let at=unit.offset;at<unit.offset+unit.count;at++){
        point.fromBufferAttribute(g.attributes.position,g.index.getX(at));indexedBox.expandByPoint(point);
        assert.ok(g.boundingBox.containsPoint(point),`${payload.id}/${unit.key}: bounds exclude indexed vertex`);
        assert.ok(point.distanceTo(g.boundingSphere.center)<=g.boundingSphere.radius+1e-12);
      }
      assert.ok(indexedBox.min.distanceTo(g.boundingBox.min)<1e-7);assert.ok(indexedBox.max.distanceTo(g.boundingBox.max)<1e-7);
      // A narrow camera aimed at each unit exercises false positives from the
      // old village-wide sphere. The selected unit must survive every rotation.
      mesh.scale.setScalar(16);mesh.position.set(192,-unit.min[1]*16+.018,48);mesh.updateMatrixWorld(true);
      // The camera uses this house's unit bounds, never the shared village
      // positions. Check actual indexed vertices after the native scale/yaw.
      for(const yaw of [0,.73,Math.PI/2]){
        mesh.rotation.y=yaw;mesh.updateMatrixWorld(true);
        const local=new THREE.Box3(new THREE.Vector3(...unit.min),new THREE.Vector3(...unit.max)),volume=cameraModelVolume(unit.key,local,mesh.matrixWorld);
        for(let at=unit.offset;at<unit.offset+unit.count;at++){
          point.fromBufferAttribute(g.attributes.position,g.index.getX(at)).applyMatrix4(mesh.matrixWorld);
          assert.ok(sweepCameraVolume(point.toArray(),point.toArray(),volume,1e-5),`${payload.id}/${unit.key}: camera bounds exclude indexed vertex`);
        }
      }
      mesh.rotation.y=0;mesh.updateMatrixWorld(true);
      const center=g.boundingSphere.center.clone().applyMatrix4(mesh.matrixWorld),camera=new THREE.PerspectiveCamera(25,1,.1,40);
      for(let angle=0;angle<4;angle++){
        camera.position.copy(center).add(new THREE.Vector3(Math.cos(angle*Math.PI/2)*12,4,Math.sin(angle*Math.PI/2)*12));camera.lookAt(center);camera.updateMatrixWorld(true);
        const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
        assert.ok(frustum.intersectsObject(mesh));
        for(const other of meshes){
          const u=other.userData.unit;other.scale.setScalar(16);other.position.set(192,-u.min[1]*16+.018,48);other.updateMatrixWorld(true);
          const tight=frustum.intersectsObject(other),saved=other.geometry.boundingSphere;
          other.geometry.boundingSphere=wholeSphere;const broad=frustum.intersectsObject(other);other.geometry.boundingSphere=saved;
          if(broad&&!tight)rejectedByUnitOnly++;
        }
      }
    }
    meshes.forEach(m=>m.geometry.dispose());meshes[0].material.dispose();
  }
  assert.ok(rejectedByUnitOnly>0,'unit bounds must improve actual frustum selection');texture.dispose();
});

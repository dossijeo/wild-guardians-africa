import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js';
import { WebGPUCoordinateSystem } from 'three/src/constants.js';
import { Mesh } from 'three/src/objects/Mesh.js';
import { BoxGeometry } from 'three/src/geometries/BoxGeometry.js';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js';
import { Frustum } from 'three/src/math/Frustum.js';
import { Matrix4 } from 'three/src/math/Matrix4.js';
import { installRemoteCameraEnvelope, remoteCameraWithinEnvelope } from '../src/rendering/remote-camera-envelope.js';
import { createSharedCameraMailbox } from '../src/rendering/shared-camera-mailbox.js';
import { createRemoteCameraState } from '../src/rendering/remote-camera-state.js';

function camera() {
 const result = new PerspectiveCamera(45, 16/9, .1, 500);
 result.coordinateSystem = WebGPUCoordinateSystem; result.updateProjectionMatrix(); result.updateMatrixWorld();
 return result;
}
function sample(x = 0, targetX = x, fov = 45) {
 const mailbox = createSharedCameraMailbox();
 mailbox.write({ x, y: 0, z: 0, targetX, targetY: 0, targetZ: -50, fov, near: .1, far: 500 }, 1);
 return createRemoteCameraState({ mailbox: mailbox.buffer }).sample({ width: 1600, height: 900 });
}

test('envelope certifies immediate pan/orbit/zoom inside its volume and rejects jumps outside', () => {
 const renderer = { _projectObject() {} }, owner = installRemoteCameraEnvelope({ renderer, camera: camera() });
 const certificate = owner.begin({ cameraVersion: 7 }); owner.end();
 assert.equal(certificate.cameraVersion, 7);
 assert.equal(remoteCameraWithinEnvelope(sample(), certificate), true);
 assert.equal(remoteCameraWithinEnvelope(sample(8), certificate), true);
 assert.equal(remoteCameraWithinEnvelope(sample(0, 6), certificate), true);
 assert.equal(remoteCameraWithinEnvelope(sample(0, 0, 55), certificate), true);
 assert.equal(remoteCameraWithinEnvelope(sample(80), certificate), false);
 assert.equal(remoteCameraWithinEnvelope(sample(0, 70), certificate), false);
 assert.equal(remoteCameraWithinEnvelope(sample(), { ...certificate, planes: [NaN] }), false);
 owner.dispose();
});

test('expands only bounded main-camera draw eligibility and leaves auxiliary passes and properties intact', () => {
 const main = camera(), auxiliary = camera(), admitted = [];
 const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(main.projectionMatrix, main.matrixWorldInverse), WebGPUCoordinateSystem);
 const renderer = { _projectObject(object, passCamera) { if (!object.frustumCulled || frustum.intersectsObject(object)) admitted.push({ object, passCamera }); } };
 const owner = installRemoteCameraEnvelope({ renderer, camera: main });
 const model = new Mesh(new BoxGeometry(1,1,1), new MeshBasicMaterial());
 model.position.set(45, 0, -50); model.updateMatrixWorld();
 assert.equal(frustum.intersectsObject(model), false);
 renderer._projectObject(model, main); assert.equal(admitted.length, 0);
 owner.begin(); renderer._projectObject(model, main); assert.equal(admitted.length, 1);
 assert.equal(model.frustumCulled, true);
 renderer._projectObject(model, auxiliary); assert.equal(admitted.length, 1);
 model.position.x = 300; model.updateMatrixWorld();
 renderer._projectObject(model, main); assert.equal(admitted.length, 1);
 owner.end(); model.position.x = 45; model.updateMatrixWorld();
 renderer._projectObject(model, main); assert.equal(admitted.length, 1);
 owner.dispose(); model.geometry.dispose(); model.material.dispose();
});

test('restores per-object culling after an interrupted preparation pass', () => {
 const main = camera(), renderer = { _projectObject() { throw Error('test'); } };
 const owner = installRemoteCameraEnvelope({ renderer, camera: main });
 const model = new Mesh(new BoxGeometry(1,1,1), new MeshBasicMaterial());
 model.position.z = -10; model.updateMatrixWorld();
 owner.begin(); assert.throws(() => renderer._projectObject(model, main), /test/);
 assert.equal(model.frustumCulled, true); owner.end(); owner.dispose();
 model.geometry.dispose(); model.material.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js';
import { WebGPUCoordinateSystem } from 'three/src/constants.js';
import { createSharedCameraMailbox } from '../src/rendering/shared-camera-mailbox.js';
import { createRemoteCameraState } from '../src/rendering/remote-camera-state.js';
import { installRemoteCameraBindings } from '../src/rendering/remote-camera-bindings.js';
import Bindings from 'three/src/renderers/common/Bindings.js';
import BindGroup from 'three/src/renderers/common/BindGroup.js';
import NodeUniformsGroup from 'three/src/renderers/common/nodes/NodeUniformsGroup.js';
import { Matrix4NodeUniform, NumberNodeUniform } from 'three/src/renderers/common/nodes/NodeUniform.js';
import NodeUniform from 'three/src/nodes/core/NodeUniform.js';
import UniformNode from 'three/src/nodes/core/UniformNode.js';
import { renderGroup } from 'three/src/nodes/core/UniformGroupNode.js';
import { Matrix4 } from 'three/src/math/Matrix4.js';

const pose = { x: 15, y: 22, z: 37, targetX: 4, targetY: 1, targetZ: 3, fov: 47, near: 0.3, far: 1400 };
function close(actual, expected) {
 assert.equal(actual.length, expected.length);
 for (let i = 0; i < actual.length; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 0.00001, `${i}: ${actual[i]} != ${expected[i]}`);
}

test('mailbox camera matches Three WebGPU projection and world/view matrices across viewport and lens changes', () => {
 const mailbox = createSharedCameraMailbox(), state = createRemoteCameraState({ mailbox: mailbox.buffer });
 for (const [i, [width, height, fov, near, far]] of [[1600,900,47,0.3,1400],[800,1000,88,2,400]].entries()) {
  const p = { ...pose, fov, near, far };
  mailbox.write(p, i + 1);
  const actual = state.sample({ width, height });
  const camera = new PerspectiveCamera(fov, width / height, near, far);
  camera.coordinateSystem = WebGPUCoordinateSystem; camera.updateProjectionMatrix();
  camera.position.set(p.x, p.y, p.z); camera.lookAt(p.targetX,p.targetY,p.targetZ); camera.updateMatrixWorld();
  close(actual.values.cameraWorldMatrix, camera.matrixWorld.elements);
  close(actual.values.cameraViewMatrix, camera.matrixWorldInverse.elements);
  close(actual.values.cameraProjectionMatrix, camera.projectionMatrix.elements);
  close(actual.values.cameraProjectionMatrixInverse, camera.projectionMatrixInverse.elements);
  assert.equal(actual.version, i + 1);
 }
});

test('camera reader rejects stale/invalid versions and never waits for a writer', () => {
 const mailbox = createSharedCameraMailbox(), state = createRemoteCameraState({ mailbox: mailbox.buffer });
 const viewport = { width: 1280, height: 720 };
 assert.equal(state.sample(viewport), null);
 mailbox.write(pose, 2);
 const sample = state.sample(viewport), revision = sample.revision;
 mailbox.write({ ...pose, x: 900 }, 1);
 assert.equal(state.sample(viewport).version, 2);
 assert.equal(sample.values.cameraPosition[0], pose.x);
 mailbox.write({ ...pose, near: -1 }, 3);
 assert.equal(state.sample(viewport).revision, revision);
 Atomics.add(new Int32Array(mailbox.buffer, 0, 2), 0, 1);
 assert.equal(state.sample(viewport).revision, revision);
 assert.equal(state.sample({ width: 0, height: 720 }), null);
 assert.equal(state.sample({ width: 720, height: 1280 }).revision, revision + 1);
 state.setMailbox(createSharedCameraMailbox().buffer);
 assert.equal(state.sample(viewport), null);
});

function fixture() {
 const camera = {}, auxiliary = {}, calls = [], unsupported = [], data = new WeakMap();
 const binding = { isNodeUniformsGroup: true, uniforms: [
  { offset: 4, nodeUniform: { node: { name: 'cameraViewMatrix' } } },
  { offset: 20, nodeUniform: { node: { name: 'cameraPosition' } } },
  { offset: 24, nodeUniform: { node: { name: 'materialColor' } } },
 ] };
 const buffer = {}; data.set(binding, { buffer });
 const groups = [{ bindings: [binding] }];
 const backend = { get: b => data.get(b), updateBinding() {} };
 const renderer = { backend, _bindings: { getForRender: object => object.groups } };
 const remote = { registerCameraBinding: (gpu, descriptor) => calls.push({ gpu, ...descriptor }) };
 const install = installRemoteCameraBindings({ renderer, remote, camera, onUnsupported: value => unsupported.push(value) });
 return { camera, auxiliary, calls, unsupported, binding, buffer, groups, renderer, install, data };
}

test('registers stable byte offsets once and revokes when a buffer is reused by an auxiliary camera', () => {
 const f = fixture(), object = { camera: f.camera, groups: f.groups };
 f.renderer._bindings.getForRender(object);
 assert.deepEqual(f.calls.map(({ byteOffset, semantic }) => ({ byteOffset, semantic })), [
  { byteOffset: 16, semantic: 'cameraViewMatrix' }, { byteOffset: 80, semantic: 'cameraPosition' },
 ]);
 f.renderer._bindings.getForRender(object); f.renderer.backend.updateBinding(f.binding);
 assert.equal(f.calls.length, 2);
 f.renderer._bindings.getForRender({ camera: f.auxiliary, groups: f.groups });
 assert.equal(f.calls.length, 4); assert.equal(f.calls[2].enabled, false);
 f.renderer.backend.updateBinding(f.binding); f.renderer._bindings.getForRender(object);
 assert.equal(f.calls.length, 4);
 assert.equal(f.unsupported[0].reason, 'camera-binding-shared-between-cameras');
 f.install.dispose();
});

test('never registers shadow-only buffers and handles replacement of a main-camera GPU buffer', () => {
 const auxiliary = fixture();
 auxiliary.renderer._bindings.getForRender({ camera: auxiliary.auxiliary, groups: auxiliary.groups });
 assert.equal(auxiliary.calls.length, 0); auxiliary.install.dispose();
 const f = fixture(); f.renderer._bindings.getForRender({ camera: f.camera, groups: f.groups });
 const replacement = {}; f.data.set(f.binding, { buffer: replacement });
 f.renderer.backend.updateBinding(f.binding);
 assert.equal(f.calls.length, 6); assert.equal(f.calls[2].enabled, false);
 assert.equal(f.calls[4].gpu, replacement);
 f.install.dispose(); assert.equal(f.calls.at(-1).enabled, false);
});

test('actual Three Bindings initializes aligned offsets before registration, including skipped group updates', () => {
 const camera = {}, calls = [], order = [], resources = new WeakMap();
 const node = new UniformNode(new Matrix4(), 'mat4').setName('cameraViewMatrix').setGroup(renderGroup);
 const uniforms = new NodeUniformsGroup('render', renderGroup);
 uniforms.addUniform(new NumberNodeUniform(new NodeUniform('nodeUniform0', 'float', new UniformNode(123, 'float'))));
 uniforms.addUniform(new Matrix4NodeUniform(new NodeUniform('nodeUniform1', 'mat4', node)));
 const group = new BindGroup('render', [uniforms]), groups = [group];
 const backend = {
  get(binding) { if (!resources.has(binding)) resources.set(binding, {}); return resources.get(binding); },
  createBindings(bindGroup, allBindings, cacheIndex) {
   assert.equal(bindGroup, group); assert.equal(allBindings, groups); assert.equal(cacheIndex, 0);
   // WebGPUBindingUtils allocates the buffer from byteLength, which computes
   // uniform.offset. A mat4 after a float starts at byte 16, not byte 4.
   this.get(uniforms).buffer = { size: uniforms.byteLength }; order.push('create');
  },
  updateBinding(binding) { assert.equal(binding, uniforms); order.push('update'); },
 };
 let shouldUpdate = true;
 const renderer = { backend, _bindings: new Bindings(backend, { updateGroup: () => shouldUpdate }, {}, {}, {}, {}) };
 const registration = installRemoteCameraBindings({ renderer, camera, remote: { registerCameraBinding(buffer, descriptor) { order.push('register'); calls.push({ buffer, ...descriptor }); } } });
 const renderObject = { camera, getBindings: () => groups };
 renderer._bindings.updateForRender(renderObject);
 assert.equal(calls.length, 1); assert.equal(calls[0].byteOffset, 16);
 assert.deepEqual(order.slice(0, 2), ['create', 'register']);
 shouldUpdate = false; renderer._bindings.updateForRender(renderObject);
 assert.equal(calls.length, 1);
 renderer._bindings.getForRender({ camera: {}, getBindings: () => groups });
 assert.equal(calls.at(-1).enabled, false);
 registration.dispose();
});

import { REMOTE_CAMERA_SEMANTICS } from './remote-camera-state.js';

// Only the exact main-camera render context may register a camera uniform.
// Shared render groups used by another camera are revoked, never repurposed.
// Discovery happens in the preparation worker, once per binding; the consumer
// receives stable buffer offsets and never inspects a Three node graph.
export function installRemoteCameraBindings({ renderer, remote, camera, onUnsupported = () => {} }) {
 const bindings = renderer?._bindings, backend = renderer?.backend;
 if (!bindings?.getForRender || !backend?.get || !remote?.registerCameraBinding || !camera) throw new TypeError('Remote camera bindings require an initialized renderer, remote client and main camera');
 const records = new WeakMap(), renderRecords = new WeakMap(), registered = new Set();
 const originalGet = bindings.getForRender;
 let activeCamera = null, disposed = false;
 const restorers = [];
 function revoke(record) {
  if (!record.buffer) return;
  for (const descriptor of record.descriptors) remote.registerCameraBinding(record.buffer, { ...descriptor, enabled: false });
  registered.delete(record); record.buffer = null;
 }
 function inspect(binding, currentCamera) {
  if (disposed || !binding.isNodeUniformsGroup || !currentCamera) return;
  let record = records.get(binding);
  if (!record) {
   const descriptors = [];
   for (const uniform of binding.uniforms ?? []) {
    const semantic = uniform.nodeUniform?.node?.name;
    if (Object.hasOwn(REMOTE_CAMERA_SEMANTICS, semantic) && Number.isInteger(uniform.offset)) descriptors.push({ byteOffset: uniform.offset * 4, semantic });
    // These depend on CPU pose evaluation or an unsupported camera contract.
    if (semantic === 'cameraNormalMatrix' || semantic?.startsWith('highpModelView')) onUnsupported({ reason: 'unsupported-camera-uniform', semantic });
   }
   record = { descriptors, camera: currentCamera, ambiguous: false, buffer: null };
   records.set(binding, record);
  }
  if (record.camera !== currentCamera && !record.ambiguous) {
   record.ambiguous = true; revoke(record);
   if (record.descriptors.length) onUnsupported({ reason: 'camera-binding-shared-between-cameras' });
  }
  if (record.ambiguous || currentCamera !== camera || !record.descriptors.length) return;
  const buffer = backend.get(binding).buffer;
  if (!buffer || record.buffer === buffer) return;
  revoke(record); record.buffer = buffer;
  for (const descriptor of record.descriptors) remote.registerCameraBinding(buffer, { ...descriptor, enabled: true });
  registered.add(record);
 }
 function getForRender(renderObject) {
  if (disposed) return originalGet.call(this, renderObject);
  const previous = activeCamera; activeCamera = renderObject.camera;
  try {
   const groups = originalGet.call(this, renderObject);
   let entry = renderRecords.get(renderObject);
   if (!entry || entry.groups !== groups || entry.camera !== activeCamera) {
    for (const group of groups) for (const binding of group.bindings) inspect(binding, activeCamera);
    renderRecords.set(renderObject, { groups, camera: activeCamera });
   }
   return groups;
  } finally { activeCamera = previous; }
 }
 bindings.getForRender = getForRender;
 restorers.push(() => { if (bindings.getForRender === getForRender) bindings.getForRender = originalGet; });
 for (const method of ['createBindings', 'updateBindings', 'updateBinding']) {
  if (typeof backend[method] !== 'function') continue;
  const original = backend[method];
  const wrapper = function(binding, ...args) {
   const result = original.call(this, binding, ...args);
   if (method === 'updateBinding') inspect(binding, activeCamera || records.get(binding)?.camera);
   else for (const item of binding.bindings ?? []) inspect(item, activeCamera);
   return result;
  };
  backend[method] = wrapper;
  restorers.push(() => { if (backend[method] === wrapper) backend[method] = original; });
 }
 return { dispose() { if (disposed) return; disposed = true; for (const restore of restorers.reverse()) restore(); for (const record of [...registered]) revoke(record); } };
}

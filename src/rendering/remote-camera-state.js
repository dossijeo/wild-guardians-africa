import { Matrix4 } from 'three/src/math/Matrix4.js';
import { Vector3 } from 'three/src/math/Vector3.js';
import { WebGPUCoordinateSystem } from 'three/src/constants.js';
import { createSharedCameraMailbox } from './shared-camera-mailbox.js';

export const REMOTE_CAMERA_SEMANTICS = Object.freeze({
 cameraViewMatrix: 16, cameraWorldMatrix: 16,
 cameraProjectionMatrix: 16, cameraProjectionMatrixInverse: 16,
 cameraPosition: 3, cameraNear: 1, cameraFar: 1,
});

// A math-only consumer: no Scene, renderer, graph traversal or blocking read.
// The host must certify that the recorded draw set covers the sampled camera.
// Arrays stay resident and are overwritten only when pose/viewport changes.
export function createRemoteCameraState({ mailbox = null } = {}) {
 let reader = null, pose = null, version = 0, width = 0, height = 0;
 const world = new Matrix4(), view = new Matrix4(), projection = new Matrix4(), inverse = new Matrix4();
 const eye = new Vector3(), target = new Vector3(), up = new Vector3(0, 1, 0);
 const values = Object.fromEntries(Object.entries(REMOTE_CAMERA_SEMANTICS).map(([key, count]) => [key, new Float32Array(count)]));
 const result = { version: 0, revision: 0, width: 0, height: 0, values };
 function setMailbox(buffer) {
  reader = buffer ? createSharedCameraMailbox(buffer) : null;
  pose = null; version = 0; width = 0; height = 0;
 }
 function sample({ width: nextWidth, height: nextHeight } = {}) {
  if (!(Number.isFinite(nextWidth) && nextWidth > 0 && Number.isFinite(nextHeight) && nextHeight > 0)) return null;
  const incoming = reader?.read();
  let changed = false;
  if (incoming && incoming.version > version) {
   const p = incoming.pose;
   if (p.fov > 0 && p.fov < 180 && p.near > 0 && p.far > p.near &&
       [p.x,p.y,p.z,p.targetX,p.targetY,p.targetZ,p.fov,p.near,p.far].every(Number.isFinite)) {
    pose = p; version = incoming.version; changed = true;
   }
  }
  if (!pose) return null;
  if (!changed && width === nextWidth && height === nextHeight) return result;
  width = nextWidth; height = nextHeight;
  eye.set(pose.x, pose.y, pose.z); target.set(pose.targetX, pose.targetY, pose.targetZ);
  world.identity().lookAt(eye, target, up).setPosition(eye);
  view.copy(world).invert();
  const top = pose.near * Math.tan(pose.fov * Math.PI / 360), right = top * width / height;
  projection.makePerspective(-right, right, top, -top, pose.near, pose.far, WebGPUCoordinateSystem);
  inverse.copy(projection).invert();
  values.cameraWorldMatrix.set(world.elements); values.cameraViewMatrix.set(view.elements);
  values.cameraProjectionMatrix.set(projection.elements); values.cameraProjectionMatrixInverse.set(inverse.elements);
  values.cameraPosition.set([pose.x,pose.y,pose.z]); values.cameraNear[0] = pose.near; values.cameraFar[0] = pose.far;
  result.version = version; result.revision++; result.width = width; result.height = height;
  return result;
 }
 setMailbox(mailbox);
 return { setMailbox, sample };
}

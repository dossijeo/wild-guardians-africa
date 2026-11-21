import { Frustum } from 'three/src/math/Frustum.js';
import { Matrix4 } from 'three/src/math/Matrix4.js';
import { Vector3 } from 'three/src/math/Vector3.js';
import { WebGPUCoordinateSystem } from 'three/src/constants.js';

// The preparation pass records a bounded superset of its normal draw list.
// Only renderables intersecting this envelope bypass Three's narrower cull;
// visibility/layers/material visibility, sorting and auxiliary cameras remain
// Three's responsibility. No scene traversal or global frustum patch is used.
export function installRemoteCameraEnvelope({ renderer, camera, angularMargin = 12, translationMargin = 16 } = {}) {
 if (typeof renderer?._projectObject !== 'function' || !camera?.isPerspectiveCamera ||
     !Number.isFinite(angularMargin) || angularMargin < 0 || angularMargin > 45 ||
     !Number.isFinite(translationMargin) || translationMargin < 0) throw TypeError('Invalid remote camera envelope');
 const original = renderer._projectObject, frustum = new Frustum(), projection = new Matrix4(), clip = new Matrix4();
 let active = false, certificate = null, inclusionCount = 0;
 function begin({ cameraVersion = 0 } = {}) {
  if (active) throw Error('Remote camera envelope already active');
  if (camera.coordinateSystem !== WebGPUCoordinateSystem || camera.reversedDepth || camera.view?.enabled || camera.zoom !== 1 || camera.filmOffset !== 0) throw Error('Unsupported autonomous camera projection');
  camera.updateMatrixWorld();
  const fov = Math.min(179, camera.fov + angularMargin * 2), top = camera.near * Math.tan(fov * Math.PI / 360), right = top * camera.aspect;
  // Rotating a rectangular frustum pushes a far corner past the old far plane.
  // Include that bounded extension as well as widening the side planes.
  const far = camera.far * (1 + Math.tan(camera.fov * Math.PI / 360) * Math.hypot(1, camera.aspect) * Math.sin(angularMargin * Math.PI / 180));
  projection.makePerspective(-right, right, top, -top, camera.near, far, WebGPUCoordinateSystem);
  clip.multiplyMatrices(projection, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(clip, WebGPUCoordinateSystem);
  for (const plane of frustum.planes) plane.constant += translationMargin;
  certificate = { kind: 'resident-frustum-envelope-v1', cameraVersion,
   planes: frustum.planes.flatMap(plane => [...plane.normal.toArray(), plane.constant]),
   angularMargin, translationMargin };
  inclusionCount = 0; active = true;
  return certificate;
 }
 function project(object, passCamera, ...args) {
  let broaden = false;
  if (active && passCamera === camera && object.visible && object.frustumCulled && object.layers.test(camera.layers)) {
   if (object.isSprite) broaden = frustum.intersectsSprite(object);
   else if (object.isMesh || object.isLine || object.isPoints) broaden = frustum.intersectsObject(object);
  }
  if (!broaden) return original.call(this, object, passCamera, ...args);
  const previous = object.frustumCulled;
  object.frustumCulled = false; inclusionCount++;
  try { return original.call(this, object, passCamera, ...args); }
  finally { object.frustumCulled = previous; }
 }
 renderer._projectObject = project;
 return {
  begin,
  end() { if (!active) throw Error('Remote camera envelope is not active'); active = false; return certificate; },
  status() { return { active, inclusionCount }; },
  dispose() { active = false; if (renderer._projectObject === project) renderer._projectObject = original; },
 };
}

// Eight clip-volume corners suffice: both frusta are convex. This is only a
// draw-list certificate, not a claim that unloaded chunks exist. Streaming
// ownership must separately guarantee the resident content expected there.
const corner = new Vector3(), worldFromClip = new Matrix4(), projectionInverse = new Matrix4();
export function remoteCameraWithinEnvelope(sample, certificate) {
 if (certificate?.kind !== 'resident-frustum-envelope-v1' || !Array.isArray(certificate.planes) ||
     certificate.planes.length !== 24 || !certificate.planes.every(Number.isFinite) ||
     !sample?.values?.cameraWorldMatrix || !sample.values.cameraProjectionMatrixInverse) return false;
 worldFromClip.fromArray(sample.values.cameraWorldMatrix);
 projectionInverse.fromArray(sample.values.cameraProjectionMatrixInverse);
 worldFromClip.multiply(projectionInverse);
 for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [0, 1]) {
  corner.set(x, y, z).applyMatrix4(worldFromClip);
  if (![corner.x,corner.y,corner.z].every(Number.isFinite)) return false;
  for (let i = 0; i < 24; i += 4) {
   const planes = certificate.planes;
   if (planes[i]*corner.x + planes[i+1]*corner.y + planes[i+2]*corner.z + planes[i+3] < -0.01) return false;
  }
 }
 return true;
}

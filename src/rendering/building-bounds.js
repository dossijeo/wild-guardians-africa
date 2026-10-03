import * as THREE from 'three';
import {destructionVertex} from './destruction-native.js';

// Conservative envelopes of the native vertex recipe, computed once per culture.
// Rotation preserves distance to the anchor; drift and fall are bounded for all
// t in [0,1]. Include the recessed interior before rotating and the floor clamp.
export function nativeBuildingBounds(body,ash){
  for(const operation of ['p-=n*uInner*.21;', 'p=rotateAxis(p-aAnchor,axis,angle)+aAnchor;',
    '*t*t*.72;', 'p.y-=aAnchor.y*t*t*1.22;', '.035+abs(sin(aSeed*27.0))*.045*t',
    'p.xz*=mix(.15,1.0,ashGrow);p.y*=mix(.3,1.0,ashGrow);'])
    if(!destructionVertex.includes(operation))throw Error('Native building deformation bounds require an updated contract');
  const still=new THREE.Box3(),fall=new THREE.Box3(),p=new THREE.Vector3(),a=new THREE.Vector3(),n=new THREE.Vector3(),inner=new THREE.Vector3(),lo=new THREE.Vector3(),hi=new THREE.Vector3();
  const positions=body.attributes.aPos,anchors=body.attributes.aAnchor,normals=body.attributes.aNormal;
  for(let i=0;i<positions.count;i++){
    p.fromBufferAttribute(positions,i);a.fromBufferAttribute(anchors,i);n.fromBufferAttribute(normals,i);
    inner.copy(p).addScaledVector(n,-.21);
    const radius=Math.max(p.distanceTo(a),inner.distanceTo(a));
    lo.set(a.x-radius-.72,Math.max(.035,a.y-radius-Math.max(0,a.y*1.22)),a.z-radius-.72);
    hi.set(a.x+radius+.72,Math.max(.08,a.y+radius+Math.max(0,-a.y*1.22)),a.z+radius+.72);
    fall.expandByPoint(lo);fall.expandByPoint(hi);
    // t=0 still applies the floor clamp, even below the collapse threshold.
    still.expandByPoint(p);still.expandByPoint(inner);
    p.y=Math.max(p.y,.035);inner.y=Math.max(inner.y,.035);still.expandByPoint(p);still.expandByPoint(inner);
  }
  const ashBox=ash.boundingBox.clone().expandByPoint(new THREE.Vector3());
  const envelope=box=>box.expandByScalar(1e-4).getBoundingSphere(new THREE.Sphere());
  return {still:envelope(still),fall:envelope(fall),ash:envelope(ashBox)};
}

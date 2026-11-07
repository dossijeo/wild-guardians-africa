import {Raycaster,Vector3} from 'three';
// Fixed settlements reuse a previously sampled height until the authoritative
// chunk mesh changes. Mesh identity is the revision: residency replaces rather
// than mutates terrain geometry, and WeakMap permits evicted chunks to collect.
export function createSettlementHeightSampler(residency){
 if(typeof residency?.get!=='function')throw TypeError('Invalid terrain residency');const cached=new WeakMap(),ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);
 return (x,z)=>{const mesh=(residency.getVisible??residency.get).call(residency,Math.floor((x+24)/48),Math.floor((z+24)/48));if(!mesh)return null;let positions=cached.get(mesh);if(!positions){positions=new Map();cached.set(mesh,positions);}const key=`${x},${z}`;if(positions.has(key))return positions.get(key);mesh.updateWorldMatrix(true,false);ray.set(origin.set(x,1000,z),down);const y=ray.intersectObject(mesh,false)[0]?.point.y??null;if(positions.size>=1024)positions.delete(positions.keys().next().value);positions.set(key,y);return y;};
}

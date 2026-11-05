import {Raycaster,Vector3} from 'three';
export function hasResidentActorTerrain(residency,x,z){return !!residency.get(Math.floor((x+24)/48),Math.floor((z+24)/48));}
// The terrain residency replaces a chunk mesh on revision; reusing the last
// sample is exact while both coordinates and mesh identity remain unchanged.
export function createActorTerrainSampler(residency){
 if(typeof residency?.get!=='function')throw TypeError('Invalid terrain residency');const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);let lastMesh,lastX,lastZ,height=0;
 return (x,z)=>{const mesh=residency.get(Math.floor((x+24)/48),Math.floor((z+24)/48));if(mesh===lastMesh&&x===lastX&&z===lastZ)return height;lastMesh=mesh;lastX=x;lastZ=z;if(!mesh)return height=0;const fx=x-Math.floor(x),fz=z-Math.floor(z),edge=fx<1e-9||fz<1e-9||1-fx<1e-9||1-fz<1e-9||Math.abs(fx+fz-1)<1e-9;if(!edge){const residentHeight=residency.surface?.(x,z);if(Number.isFinite(residentHeight))return height=residentHeight;}mesh.updateWorldMatrix(true,false);ray.set(origin.set(x,1000,z),down);height=ray.intersectObject(mesh,false)[0]?.point.y??0;return height;};
}

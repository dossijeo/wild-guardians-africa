import {Frustum,Matrix4,Sphere} from 'three';
const frustum=new Frustum(),projection=new Matrix4(),instance=new Matrix4(),world=new Matrix4(),sphere=new Sphere();
export function countOutsideShadow(camera,mesh){
 const geometry=mesh.geometry;if(!geometry.boundingSphere)geometry.computeBoundingSphere();if(!geometry.boundingSphere)return {outside:0,unknown:mesh.count};
 projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);let outside=0;
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,instance);world.multiplyMatrices(mesh.matrixWorld,instance);sphere.copy(geometry.boundingSphere).applyMatrix4(world);if(!frustum.intersectsSphere(sphere))outside++;}
 return {outside,unknown:0};
}

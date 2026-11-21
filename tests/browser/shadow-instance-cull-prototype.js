// Diagnostic only: rewrites and restores shadow proxy instance buffers.
import {Frustum,Matrix4,Sphere} from 'three';
export function installShadowInstanceCull(world){
 const map=world.renderer.shadowMap,original=map.render,frustum=new Frustum(),projection=new Matrix4(),inst=new Matrix4(),matrix=new Matrix4(),sphere=new Sphere();let enabled=false;const stats={calls:0,examined:0,removed:0,ms:0};
 map.render=function(lights,scene,camera){if(!enabled||scene!==world.scene||!lights.includes(world.sun))return original.call(this,lights,scene,camera);const begin=performance.now(),changed=[];stats.calls++;
 try{world.sun.shadow.updateMatrices(world.sun);const shadowCamera=world.sun.shadow.camera;projection.multiplyMatrices(shadowCamera.projectionMatrix,shadowCamera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);
  const chunks=world.assetGroups.enabled?world.assetGroups.shadowChunks:world.chunks;
  for(const group of chunks.values()){if(!group.visible)continue;for(const batch of group.userData.lodBatches??[]){const mesh=batch.shadow;if(!mesh?.castShadow||!mesh.count||!batch.meshes.some(m=>m.visible&&m.count)||mesh.customDepthMaterial||mesh.geometry.morphAttributes.position?.length)continue;
   if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();if(!mesh.geometry.boundingSphere)continue;const count=mesh.count,array=mesh.instanceMatrix.array,kept=[];stats.examined+=count;
   for(let i=0;i<count;i++){inst.fromArray(array,i*16);matrix.multiplyMatrices(group.matrixWorld,inst);sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrix);sphere.radius+=1e-5*(1+sphere.radius);if(frustum.intersectsSphere(sphere))kept.push(i);}
   if(kept.length===count)continue;const backup=array.slice(0,count*16);changed.push({mesh,backup,count});for(let i=0;i<kept.length;i++)array.set(backup.subarray(kept[i]*16,kept[i]*16+16),i*16);mesh.count=kept.length;mesh.instanceMatrix.needsUpdate=true;stats.removed+=count-kept.length;
  }}
  stats.ms+=performance.now()-begin;const drawStart=performance.now();try{return original.call(this,lights,scene,camera);}finally{const restore=performance.now();for(const {mesh,backup,count} of changed){mesh.instanceMatrix.array.set(backup);mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}stats.ms+=performance.now()-restore;}
 }catch(error){for(const {mesh,backup,count} of changed){mesh.instanceMatrix.array.set(backup);mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}throw error;}};
 return {enable(value){enabled=value;},reset(){Object.assign(stats,{calls:0,examined:0,removed:0,ms:0});},stats,dispose(){map.render=original;}};
}

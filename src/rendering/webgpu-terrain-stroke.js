import {Raycaster,Vector2} from 'three';
import {visibleTerrainMeshes} from './webgpu-terrain-objects.js';
// Samples all input points against one immutable camera/terrain boundary. Yield
// between batches so a long stroke never monopolizes the presentation Worker.
export async function pickTerrainStroke({scene,camera,cameraView=null,samples,sequence=()=>0,isReady=()=>true,yieldBatch=()=>new Promise(resolve=>setTimeout(resolve,0)),batchSize=32}={}){
 if(!scene?.isScene||!camera?.isCamera||!Array.isArray(samples)||samples.length>3000||samples.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||typeof sequence!=='function'||typeof isReady!=='function'||typeof yieldBatch!=='function'||!Number.isSafeInteger(batchSize)||batchSize<1)throw TypeError('Invalid terrain stroke');
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const snapshot=camera.clone();
 if(cameraView!==null){const {x,y,z,targetX,targetY,targetZ,fov=snapshot.fov,near=snapshot.near,far=snapshot.far}=cameraView;if(![x,y,z,targetX,targetY,targetZ,fov,near,far].every(Number.isFinite)||fov<=0||fov>=180||near<=0||far<=near)throw TypeError('Invalid camera');snapshot.position.set(x,y,z);snapshot.fov=fov;snapshot.near=near;snapshot.far=far;snapshot.lookAt(targetX,targetY,targetZ);snapshot.updateProjectionMatrix();snapshot.updateMatrixWorld(true);}
 const meshes=visibleTerrainMeshes(scene),geometries=meshes.map(m=>m.geometry),ray=new Raycaster(),cursor=new Vector2(),points=[];
 const verify=()=>{const current=visibleTerrainMeshes(scene);if(!isReady()||current.length!==meshes.length||current.some((mesh,i)=>mesh!==meshes[i]||mesh.geometry!==geometries[i]))throw Error('Terrain changed during stroke picking');};
 verify();
 for(let i=0;i<samples.length;i++){if(i&&i%batchSize===0){await yieldBatch();verify();}cursor.set(samples[i][0],samples[i][1]);ray.setFromCamera(cursor,snapshot);const hit=ray.intersectObjects(meshes,false)[0];if(!hit)break;const q=[hit.point.x,hit.point.z],last=points.at(-1);if(!last||Math.hypot(q[0]-last[0],q[1]-last[1])>.07)points.push(q);}
 verify();return {points:points.length>=2?points:[],sequence:sequence()};
}

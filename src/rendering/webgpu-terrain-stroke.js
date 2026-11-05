import {Raycaster,Vector2} from 'three';
// Samples all input points against one immutable camera/terrain boundary. Yield
// between batches so a long stroke never monopolizes the presentation Worker.
export async function pickTerrainStroke({scene,camera,samples,sequence=()=>0,yieldBatch=()=>new Promise(resolve=>setTimeout(resolve,0)),batchSize=32}={}){
 if(!scene?.isScene||!camera?.isCamera||!Array.isArray(samples)||samples.length>3000||samples.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||typeof sequence!=='function'||typeof yieldBatch!=='function'||!Number.isSafeInteger(batchSize)||batchSize<1)throw TypeError('Invalid terrain stroke');
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const snapshot=camera.clone(),meshes=scene.children.filter(o=>o.userData.ground),geometries=meshes.map(m=>m.geometry),ray=new Raycaster(),cursor=new Vector2(),points=[];
 const verify=()=>{const current=scene.children.filter(o=>o.userData.ground);if(current.length!==meshes.length||current.some((mesh,i)=>mesh!==meshes[i]||mesh.geometry!==geometries[i]))throw Error('Terrain changed during stroke picking');};
 for(let i=0;i<samples.length;i++){if(i&&i%batchSize===0){await yieldBatch();verify();}cursor.set(samples[i][0],samples[i][1]);ray.setFromCamera(cursor,snapshot);const hit=ray.intersectObjects(meshes,false)[0];if(!hit)break;const q=[hit.point.x,hit.point.z],last=points.at(-1);if(!last||Math.hypot(q[0]-last[0],q[1]-last[1])>.07)points.push(q);}
 verify();return {points:points.length>=2?points:[],sequence:sequence()};
}

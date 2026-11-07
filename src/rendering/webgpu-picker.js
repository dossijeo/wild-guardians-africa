import {Box3,Raycaster,Vector2,Vector3} from 'three';
import {insideChunkClip} from './webgpu-chunk-clip.js';
import {visibleTerrainMeshes} from './webgpu-terrain-objects.js';

// Read cutout alpha lazily in the presentation Worker. If pixels or a UV set
// cannot be read we conservatively retain the hit; GPU deformation and mip
// filtering can still differ, so this remains QA-only.
export function createCutoutHitTest(){const cache=new WeakMap();function pixels(texture){const image=texture?.image;if(!image||typeof image!=='object')return null;if(cache.has(image))return cache.get(image);let result=null;try{if(image.data instanceof Uint8Array&&image.width>0&&image.height>0&&image.data.length===image.width*image.height*4)result={width:image.width,height:image.height,data:image.data};else if(typeof OffscreenCanvas!=='undefined'&&image.width>0&&image.height>0){const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);result=ctx.getImageData(0,0,image.width,image.height);}}catch{}cache.set(image,result);return result;}
 function sample(texture,hit,channel){if(!texture)return 1;const source=pixels(texture),uv=texture.channel===1?hit.uv1:hit.uv;if(!source||!uv)return null;const p=uv.clone();if(texture.matrixAutoUpdate)texture.updateMatrix();texture.transformUv(p);const x=Math.max(0,Math.min(source.width-1,Math.floor(p.x*source.width))),y=Math.max(0,Math.min(source.height-1,Math.floor(p.y*source.height)));return source.data[(y*source.width+x)*4+channel]/255;}
 return hit=>{const object=hit.object,material=Array.isArray(object.material)?object.material[hit.face?.materialIndex??0]:object.material;if(!material||!(material.alphaTest>0))return true;const alpha=sample(material.map,hit,3),mask=sample(material.alphaMap,hit,1);if(alpha===null||mask===null)return true;return (material.opacity??1)*alpha*mask>=material.alphaTest;};}

// One frozen simulation time per complete pick; revocation happens only after
// every candidate has been evaluated against the same presentation.
export function createWebGpuMotionPickSession({getTime,revoke}={}){
 if(typeof getTime!=='function'||typeof revoke!=='function')throw TypeError('Invalid motion pick session');let at=null;
 return {getPickTime(){return at;},begin(){if(at!==null)throw Error('Nested motion pick');const next=getTime();if(!Number.isFinite(next))throw Error('Invalid motion pick time');at=next;},end(){if(at===null)throw Error('No motion pick');at=null;revoke();}};
}

// Runs only on demand in the presentation Worker, against its confirmed state
// and resident scene. Simulation validates every action using the returned ID.
export function createWebGpuPicker({scene,camera,state,animals,workers={get:()=>null},cropBounds,sequence=()=>-1,isReady=()=>true,isTerrainReady=()=>true,motionInteraction=null}={}){
 if(!scene?.isScene||!camera?.isCamera||!state||typeof animals?.get!=='function'||typeof workers?.get!=='function'||typeof cropBounds!=='function'||typeof sequence!=='function'||typeof isReady!=='function'||typeof isTerrainReady!=='function'||motionInteraction!==null&&(typeof motionInteraction.begin!=='function'||typeof motionInteraction.end!=='function'))throw TypeError('Invalid WebGPU picker');
 const opaque=createCutoutHitTest(),ray=new Raycaster(),cursor=new Vector2(),box=new Box3(),point=new Vector3();
 const visibleHit=hit=>{for(let object=hit.object;object;object=object.parent)if(!object.visible)return false;return insideChunkClip(hit.point,hit.object.geometry?.getAttribute('wgChunkClip'))&&opaque(hit);};
 return {pick({x,y,terrainOnly=false}={}){if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1||typeof terrainOnly!=='boolean')throw TypeError('Invalid picking coordinate');motionInteraction?.begin();try{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);ray.setFromCamera(cursor.set(x,y),camera);const groundMeshes=visibleTerrainMeshes(scene),terrain=ray.intersectObjects(groundMeshes,false)[0],ground=terrain?{x:terrain.point.x,z:terrain.point.z}:null;if(terrainOnly)return {entityId:null,hitPoint:null,point:ground,sequence:sequence(),...(isTerrainReady(ray.ray,terrain?.distance??Infinity)?{}:{incomplete:true})};
  let entityId=null,hitPoint=null,closest=Infinity;const occluders=[...groundMeshes];scene.traverseVisible(o=>{if(o.userData.entityId||Number.isInteger(o.userData.nativePropSlot))occluders.push(o);});const blocked=ray.intersectObjects(occluders,true).find(visibleHit);if(blocked){closest=blocked.distance;for(let object=blocked.object;object;object=object.parent)if(object.userData.entityId){entityId=object.userData.entityId;hitPoint={x:blocked.point.x,y:blocked.point.y,z:blocked.point.z};break;}}
  for(const [entities,roster,skip] of [[state.raid?.animals??[],animals,'gone'],[state.workers??[],workers,'home']])for(const entity of entities){if(entity.status===skip)continue;const actor=roster.get(entity.id),root=actor?.root;if(!root?.visible)continue;const restore=actor.preparePick?.();let hit;try{hit=ray.intersectObject(root,true).find(visibleHit);}finally{restore?.();}if(hit&&hit.distance<closest){closest=hit.distance;entityId=entity.id;hitPoint={x:hit.point.x,y:hit.point.y,z:hit.point.z};}}
  for(const candidate of cropBounds()){if(!candidate?.id||![candidate.x,candidate.y,candidate.z,candidate.radius,candidate.height].every(Number.isFinite)||candidate.radius<=0||candidate.height<=0)throw TypeError('Invalid confirmed crop bounds');box.min.set(candidate.x-candidate.radius,candidate.y,candidate.z-candidate.radius);box.max.set(candidate.x+candidate.radius,candidate.y+candidate.height,candidate.z+candidate.radius);if(ray.ray.intersectBox(box,point)){const distance=point.distanceTo(ray.ray.origin);if(distance<closest){closest=distance;entityId=candidate.id;hitPoint={x:point.x,y:point.y,z:point.z};}}}
  // A terrain hit already has the visible, confirmed height. Keep it for
  // presentation-only contacts such as a Shield cast on empty ground; the
  // authoritative placement still uses the existing x/z point.
  const ready=isReady(ray.ray,closest);
  if(!entityId&&terrain&&ready&&isTerrainReady(ray.ray,terrain.distance))hitPoint={x:terrain.point.x,y:terrain.point.y,z:terrain.point.z};
  return {entityId,hitPoint,point:ground,sequence:sequence(),...(ready?{}:{incomplete:true})};}finally{motionInteraction?.end();}}};
}

// Do not route a gameplay click to an incomplete visual scene: missing
// actors or structures could otherwise expose a target behind them.
export function webGpuPickerReady(state,{animals,workers,settlements,settlementsRayReady=false,crops,crates,biome,terrain}={}){
 const expectedAnimals=(state.raid?.animals??[]).filter(a=>a.status!=='gone').length,expectedWorkers=(state.workers??[]).filter(w=>w.status!=='home').length;
 const structures=state.structures??[],expectedWalls=structures.filter(s=>s.kind==='wall').length,expectedCenters=structures.filter(s=>s.kind==='center').length,expectedVillages=(state.villages??[]).length,expectedPlants=(state.plants??[]).filter(p=>p.alive).length;
 const expectedCrates=(state.crates??[]).filter(c=>!c.delivered&&!c.carrierId).length;
 return !structures.some(s=>s.kind!=='wall'&&s.kind!=='center')&&(!(expectedWalls||expectedCenters||expectedVillages)||settlements?.selectableReady===true||settlementsRayReady===true)&&(!biome||biome.selectableReady===true)&&!terrain?.closed&&!terrain?.pending&&!terrain?.presentationPending&&(animals?.ready??0)>=expectedAnimals&&(workers?.ready??0)>=expectedWorkers&&(settlements?.walls??0)>=expectedWalls&&(settlements?.centers??0)>=expectedCenters&&(settlements?.villages??0)>=expectedVillages&&(crops?.confirmedPlants??0)>=expectedPlants&&(crates?.ready??0)>=expectedCrates;
}

import * as THREE from 'three';

// Opt-in engine-handler evidence, never physical/trusted pointer input.
export function createLoadingVisualPlantQa(diorama,report,{enabled=false}={}){
 if(!enabled)return null;
 const row={scope:'Synthetic engine-handler raycast; not physical/trusted input or save planting.',attempted:false,closed:false,candidates:0,result:null};
 report.plantAction=row;
 let owner=diorama;
 const close=({cancelled=false}={})=>{if(row.closed)return;row.closed=true;row.cancelled=cancelled;if(!row.attempted)row.skipped=cancelled?'owner cancelled':'eligible initial draw absent';owner=null;};
 const afterDraw=(actual,progress)=>{
  if(row.closed||row.attempted||actual!==owner)return;
  if(owner.disposed||owner.world.disposed||owner.world.loading.signal.aborted){close({cancelled:true});return;}
  if(!owner.prepared||!owner.interactive||!owner.plants.accepting||owner.world.cinematic||progress>=1)return;
  const initial=report.frames?.find(frame=>frame.label==='initial');
  if(!initial||initial.plants.length!==4||owner.plants.plants.length!==4)return;
  row.attempted=true;
  try{
   const rect=owner.world.canvas.getBoundingClientRect();
   if(![rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)throw Error('Invalid canvas client rectangle');
   owner.camera.updateMatrixWorld();owner.ground.updateWorldMatrix(true,false);
   const point=new THREE.Vector3(),ndc=new THREE.Vector3(),cursor=new THREE.Vector2();let selected=null;
   for(let i=0;i<12;i++){
    row.candidates++;
    const angle=i*Math.PI/6;
    point.set(Math.cos(angle)*3.4,Math.sin(angle)*3.4,0).applyMatrix4(owner.ground.matrixWorld);
    if(Math.hypot(point.x,point.z)>owner.plants.radius||owner.plants.plants.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<owner.plants.spacing))continue;
    ndc.copy(point).project(owner.camera);
    if(![ndc.x,ndc.y,ndc.z].every(Number.isFinite)||ndc.z< -1||ndc.z>1||Math.abs(ndc.x)>.96||Math.abs(ndc.y)>.96)continue;
    cursor.set(ndc.x,ndc.y);owner.ray.setFromCamera(cursor,owner.camera);
    const hit=owner.ray.intersectObject(owner.ground)[0];
    if(!hit||Math.hypot(hit.point.x,hit.point.z)>owner.plants.radius||owner.plants.plants.some(p=>Math.hypot(p.x-hit.point.x,p.z-hit.point.z)<owner.plants.spacing))continue;
    selected={clientX:rect.left+(ndc.x+1)*rect.width/2,clientY:rect.top+(1-ndc.y)*rect.height/2,point:hit.point.toArray()};break;
   }
   if(!selected){row.skipped='no safe projected ground point';return;}
   row.selected=selected;row.beforeCount=owner.plants.plants.length;row.progress=progress;
   const logical=owner.state.plants,ids=logical?.map(p=>p.id)??null;
   const plant=owner.plantAt(selected.clientX,selected.clientY);
   row.afterCount=owner.plants.plants.length;row.result=plant?{id:plant.id,x:plant.x,z:plant.z,growth:plant.growth}:null;
   row.logicalPlantsUnchanged=owner.state.plants===logical&&JSON.stringify(owner.state.plants?.map(p=>p.id)??null)===JSON.stringify(ids);
   if(!plant)row.error='Real plantAt rejected selected point';
  }catch(error){row.error=String(error);}
 };
 return {afterDraw,close};
}

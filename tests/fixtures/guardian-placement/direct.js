import {Vector3} from 'three';
import {guardianPlacement} from '../../../src/rendering/guardian-placement.js';

// Experimental only. Conservative checks precede the existing search fallback.
export function directGuardianPlacement(args){
 const {target,camera,nav,state,bodyScale=1,occupied,occluded=()=>false,screenExclusions=[],hoverAbove=false}=args;
 if(hoverAbove||screenExclusions.length)return {position:guardianPlacement(args),direct:false};
 camera.updateWorldMatrix(true,false);
 const radius=target.radius??.7,base=Math.atan2(camera.position.x-target.x,camera.position.z-target.z),v=new Vector3();
 const rightX=camera.matrixWorld.elements[0]*.8*bodyScale,rightZ=camera.matrixWorld.elements[2]*.8*bodyScale;
 for(const offset of [0,-.9,.9,-1.5,1.5]){
  const a=base+offset,d=radius+2.1,x=target.x+Math.sin(a)*d,z=target.z+Math.cos(a)*d,y=nav.actorSurface?.(x,z)??nav.field.surface(x,z),h=y+1.7*bodyScale;
  if(!Number.isFinite(y)||!nav.placement(x,z,.8*bodyScale).valid||occupied?.(x,h,z))continue;
  if((state.workers??[]).some(w=>w.status!=='gone'&&Math.hypot(x-w.x,z-w.z)<1.1)||(state.raid?.animals??[]).some(a=>a.status!=='gone'&&Math.hypot(x-a.x,z-a.z)<.8+a.radius)||state.plants.some(p=>p.alive&&Math.hypot(x-p.x,z-p.z)<1))continue;
  let framed=true;
  for(const dx of [-1.4,1.4])for(const dz of [-1.4,1.4])for(const dy of [-1.2,1.4]){
   v.set(x+dx*bodyScale,h+dy*bodyScale,z+dz*bodyScale).applyMatrix4(camera.matrixWorldInverse);
   if(-v.z<camera.near||-v.z>camera.far){framed=false;continue;}
   v.applyMatrix4(camera.projectionMatrix);if(Math.abs(v.x)>.82||Math.abs(v.y)>.78)framed=false;
  }
  if(!framed||occluded(x,h-.9*bodyScale,z)||occluded(x,h,z)||occluded(x,h+1.1*bodyScale,z)||occluded(x-rightX,h,z-rightZ)||occluded(x+rightX,h,z+rightZ))continue;
  return {position:{x,y:h,z},direct:true};
 }
 return {position:guardianPlacement(args),direct:false};
}

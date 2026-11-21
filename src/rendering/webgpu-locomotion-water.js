import {Raycaster,Vector3} from 'three';

// The legacy effect is restricted to canyon water. Sample only a terrain
// revision already visible in the presentation; an unknown chunk is skipped.
export function createWebGpuLocomotionWater({residency,enabled=false}={}){
 if(!residency||typeof residency.get!=='function'||typeof residency.getWater!=='function'||typeof enabled!=='boolean')throw TypeError('Invalid locomotion water source');
 const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);
 return (x,z)=>{if(!Number.isFinite(x)||!Number.isFinite(z))throw TypeError('Invalid locomotion contact');const cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),ground=residency.get(cx,cz);if(!ground||residency.getVisible&&residency.getVisible(cx,cz)!==ground)return {available:false};if(!enabled)return {available:true,inside:false};const water=residency.getWater(cx,cz);if(!water||!water.visible)return {available:true,inside:false};water.updateWorldMatrix(true,false);ray.set(origin.set(x,10000,z),down);const hit=ray.intersectObject(water,false)[0];return hit?{available:true,inside:true,level:hit.point.y}:{available:true,inside:false};};
}

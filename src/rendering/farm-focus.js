import {operational} from '../simulation/rules.js';
export function primaryWorkCenter(state){
 const village=state.villages[0];
 return state.structures.filter(operational).sort((a,b)=>Math.hypot(a.x-village.x,a.z-village.z)-Math.hypot(b.x-village.x,b.z-village.z)||(a.created??0)-(b.created??0)||a.id.localeCompare(b.id))[0]??null;
}
export function savedFarmFocus(state){
 const center=primaryWorkCenter(state);if(!center)return {x:state.villages[0].x+20,z:state.villages[0].z};
 const plants=state.plants.filter(p=>p.alive&&p.centerId===center.id);if(!plants.length)return {x:center.x,z:center.z};
 const xs=plants.map(p=>p.x),zs=plants.map(p=>p.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
 return {x,z,theta:Math.hypot(x-center.x,z-center.z)>.1?Math.atan2(x-center.x,z-center.z):undefined,distance:Math.min(65,Math.max(38,Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))*1.3))};
}

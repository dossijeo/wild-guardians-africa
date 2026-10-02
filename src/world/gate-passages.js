import {nativeGateFrames,nativeGateLeaves,nativeGateLeafFootprints} from './gate-frames-native.js';
import {sweptFootprintDistance} from './footprints.js';
const cache=new WeakMap();
const swingCache=new WeakMap();
export const gateScale=entity=>({adobe:1.4,piedra:1.4,reforzado:1.6}[entity.material]??1);
export function gateFrameFootprints(entity,opening=1){
  const source=entity.gate&&nativeGateFrames[entity.material];if(!source)return null;
  const key=[entity.x,entity.z,entity.yaw??0,entity.baseScaleX??1,entity.material,opening].join(':');
  if(cache.get(entity)?.key===key)return cache.get(entity).frames;
  const c=Math.cos(entity.yaw??0),s=Math.sin(entity.yaw??0),scale=gateScale(entity),sx=scale*(entity.baseScaleX??1),leaf=nativeGateLeaves[entity.material];
  const polygons=[...source];
  if(leaf){const angle=Math.max(0,Math.min(1,opening))*Math.PI/2,co=Math.cos(angle),si=Math.sin(angle),[hx,hz]=leaf.hinge;polygons.push(nativeGateLeafFootprints[entity.material].map(([x,z])=>[hx+(x-hx)*co-(z-hz)*si,hz+(x-hx)*si+(z-hz)*co]));}
  const frames=polygons.map(side=>side.map(([x,z])=>({x:entity.x+x*sx*c+z*scale*s,z:entity.z-x*sx*s+z*scale*c})));
  cache.set(entity,{key,frames});return frames;
}
export function gateLeafFootprint(entity,opening=0){return nativeGateLeaves[entity.material]?gateFrameFootprints(entity,opening).at(-1):null;}
export function gateSwingPolygon(entity){
  const leaf=nativeGateLeaves[entity.material];if(!entity.gate||!leaf)return null;
  const key=[entity.x,entity.z,entity.yaw??0,entity.baseScaleX??1,entity.material].join(':');
  if(swingCache.get(entity)?.key===key)return swingCache.get(entity).polygon;
  const [hx,hz]=leaf.hinge,radius=Math.max(...nativeGateLeafFootprints[entity.material].map(([x,z])=>Math.hypot(x-hx,z-hz)))/Math.cos(Math.PI/24);
  const scale=gateScale(entity),sx=scale*(entity.baseScaleX??1),c=Math.cos(entity.yaw??0),s=Math.sin(entity.yaw??0);
  const polygon=Array.from({length:24},(_,i)=>{const angle=i*Math.PI/12,x=(hx+Math.cos(angle)*radius)*sx,z=(hz+Math.sin(angle)*radius)*scale;return {x:entity.x+x*c+z*s,z:entity.z-x*s+z*c};});
  swingCache.set(entity,{key,polygon});return polygon;
}
export function gateTriggerRadius(entity){return Math.max(3.2,...gateSwingPolygon(entity).map(p=>Math.hypot(p.x-entity.x,p.z-entity.z)+1.2));}
export function routeHitsGateArea(worker,polygon,maxDistance=4){
  if(!worker.path?.length||!polygon)return false;
  let previous=worker,remaining=maxDistance;
  for(const point of worker.path){
    const length=Math.hypot(point.x-previous.x,point.z-previous.z),fraction=length?Math.min(1,remaining/length):1;
    const next={x:previous.x+(point.x-previous.x)*fraction,z:previous.z+(point.z-previous.z)*fraction};
    if(sweptFootprintDistance(previous,next,polygon)<(worker.radius??.28))return true;
    remaining-=length;if(remaining<=0)break;previous=point;
  }
  return false;
}
export function gatePortalPoints(entity,radius=.28){
  const frames=gateFrameFootprints(entity);if(!frames)return [];
  const c=Math.cos(entity.yaw??0),s=Math.sin(entity.yaw??0);
  const local=frames.map(poly=>poly.map(p=>({x:(p.x-entity.x)*c-(p.z-entity.z)*s,z:(p.x-entity.x)*s+(p.z-entity.z)*c})));
  const left=Math.max(...local[0].map(p=>p.x),...(local[2]??[]).map(p=>p.x)),right=Math.min(...local[1].map(p=>p.x));
  if(right-left<=radius*2+1e-6)return [];
  const x=(left+right)/2,zs=local.flat().map(p=>p.z),ends=[Math.min(...zs)-radius-.1,Math.max(...zs)+radius+.1];
  return ends.map(z=>({x:entity.x+x*c+z*s,z:entity.z-x*s+z*c}));
}

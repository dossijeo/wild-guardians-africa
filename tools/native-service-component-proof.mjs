// Positive native grid certificates for actual service poses, not AABB filler.
// A timed/bounded path failure is never evidence of enclosure.
import {containsPoint} from '../src/world/footprints.js';
import {centerBoundaryPoint} from '../src/world/centers.js';
import {agriculturalRayClear} from '../src/simulation/raid-agricultural-impact.js';
const positiveServiceCertificates=new WeakMap();
export function nativeServiceComponentProof(s,view,targets,radius,outside,outline){
 const polygon=outline.map(([x,z])=>({x,z})),regions=new Map();let poses=0,blocked=0,certified=0,physicalConnectors=0,emptyNativeOrigins=0;
 // A native predictive view has a stable state and geometry epoch. Reuse only
 // successful per-target service certificates; new crops still receive all 32
 // physical pose checks. Ad-hoc/mutable diagnostic views take the full path.
 const cacheable=view.state===s&&Number.isSafeInteger(view.version);
 // HP loss above the collapse threshold does not change collision geometry or
 // service reachability. Status, pose and the native geometry epoch still
 // invalidate certificates on collapse, repair/rebuild or movement.
 const cacheKey=cacheable?JSON.stringify([view.version,radius,outside.x,outside.z,outline,s.structures.map(c=>[c.id,c.kind,c.status,c.x,c.z,c.yaw,c.gate,c.material,c.baseScaleX,c.culture])]):null;
 let scopes=cacheable?positiveServiceCertificates.get(view):null;
 if(cacheable&&!scopes){scopes=new Map();positiveServiceCertificates.set(view,scopes);}
 let cache=scopes?.get(cacheKey);
 if(cacheable&&!cache){cache={targets:new WeakMap()};if(scopes.size>=16)scopes.delete(scopes.keys().next().value);scopes.set(cacheKey,cache);}
 let targetRegions=null;
 const enclosed=region=>{
  targetRegions?.add(region);
  if(regions.has(region))return regions.get(region);
  const valid=[...region].every(id=>{const [x,z]=id.split(',').map(Number);return containsPoint(polygon,x,z);});regions.set(region,valid);return valid;
 };
 for(const target of targets){
  const saved=cache?.targets.get(target);
  if(saved&&saved.x===target.x&&saved.z===target.z&&saved.kind===target.kind&&saved.alive===target.alive){
   for(const region of saved.regions)enclosed(region);
   poses+=saved.poses;blocked+=saved.blocked;certified+=saved.certified;physicalConnectors+=saved.physicalConnectors;emptyNativeOrigins+=saved.emptyNativeOrigins;
   continue;
  }
  const start={poses,blocked,certified,physicalConnectors,emptyNativeOrigins};
  targetRegions=cache?new Set():null;
  const angle=Math.atan2(outside.x-target.x,outside.z-target.z),reach=.6+radius;
  for(let i=0;i<32;i++){
   const a=angle+i*Math.PI/16,point=target.kind==='center'?centerBoundaryPoint(target,a,radius+.5,s):{x:target.x+Math.sin(a)*reach,z:target.z+Math.cos(a)*reach};poses++;
   if(!view.walkable(point.x,point.z,radius,null,false)){blocked++;continue;}
   // A body-valid pose behind a solid obstacle cannot hit this crop. Use the
   // same physical contact ray as the native impact resolver; do not demand
   // an enclosure certificate for a position that cannot perform the attack.
   if(target.alive===true&&!agriculturalRayClear(s,view,point,target)){blocked++;continue;}
   if(view.segmentClear(point,outside,radius,null,false))return {valid:false,reason:'native-service-direct-route-open',targetId:target.id,point,poses,blocked,certified};
   // Reuse a *positive* native closed-component certificate when every
   // walkable origin connector around this pose belongs to that component.
   // Otherwise retain the original full A* query and all checks below.
   const closed=view.approachRegionBlocked?.(outside,point,radius,0)===true;
   if(!closed&&view.approachPath(outside,point,radius,32))return {valid:false,reason:'native-service-route-open',targetId:target.id,point,poses,blocked,certified};
   if(closed){
    // The native certificate proves that *every* walkable 3x3 connector is
    // in the same closed region. One clear body-width connector then proves
    // that this fractional service pose belongs to that enclosed region.
    // Avoid rechecking the remaining eight directed segments for each pose.
    let linked=false;
    for(let dz=-1;dz<=1&&!linked;dz++)for(let dx=-1;dx<=1&&!linked;dx++){
     const q={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};
     if(!view.walkable(q.x,q.z,radius,null,false)||!view.segmentClear(point,q,radius,null,false))continue;
     const region=view.closedRegions.get(`${radius}:null:false|${q.x},${q.z}`);
     if(!region||!enclosed(region))return {valid:false,reason:'native-service-component-unproven',targetId:target.id,point,poses,blocked,certified};
     linked=true;
    }
    if(linked){certified++;continue;}
   }
   // These are exactly the animal A* origin connectors (no worker portals).
   // Require positively exhausted, boundary-free components for every usable
   // connector. Narrow poses with no connectors remain unproven, not accepted.
   let connectors=0;
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    const q={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};
    if(!view.walkable(q.x,q.z,radius,null,false)||!view.segmentClear(point,q,radius,null,false))continue;
    connectors++;const region=view.closedRegions.get(`${radius}:null:false|${q.x},${q.z}`);
    if(!region||!enclosed(region))return {valid:false,reason:'native-service-component-unproven',targetId:target.id,point,poses,blocked,certified};
   }
   if(!connectors){
    // Some valid fractional poses have no usable 3x3 lattice connector. Do
    // not interpret the empty A* frontier as enclosure: require a real clear
    // body-width segment to a positively certified enclosed native component.
    let connected=false;
    for(let dz=-3;dz<=3&&!connected;dz++)for(let dx=-3;dx<=3&&!connected;dx++){
     const q={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz},region=view.closedRegions.get(`${radius}:null:false|${q.x},${q.z}`);
     if(region&&enclosed(region)&&view.walkable(q.x,q.z,radius,null,false)&&view.segmentClear(point,q,radius,null,false))connected=true;
    }
    if(!connected)return {valid:false,reason:'native-service-origin-unproven',targetId:target.id,point,poses,blocked,certified};
    physicalConnectors++;
   }
   certified++;
  }
  if(cache)cache.targets.set(target,{x:target.x,z:target.z,kind:target.kind,alive:target.alive,
   poses:poses-start.poses,blocked:blocked-start.blocked,certified:certified-start.certified,
   physicalConnectors:physicalConnectors-start.physicalConnectors,emptyNativeOrigins:emptyNativeOrigins-start.emptyNativeOrigins,
   regions:[...targetRegions]});
  targetRegions=null;
 }
 return {valid:true,reason:'native-service-poses-in-positive-closed-components',poses,blocked,certified,physicalConnectors,emptyNativeOrigins,regions:regions.size,
  scope:'Native 32 service poses per target from the tested exterior origin: body/contact-blocked poses and positively enclosed native origin components. Empty origin frontiers without a positive physical connector are unproven. Not a bounded route failure or universal continuous-angle proof.'};
}

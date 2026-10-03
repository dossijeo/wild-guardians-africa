import {centerFootprint,centerServicePoint} from './centers.js';
import {footprintsOverlap} from './footprints.js';
export function nearestVillageRoute(nav,departure,villages){
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const candidates=villages.map(v=>({v,lower:distance(departure,v.entry??v)}));
  candidates.sort((a,b)=>a.lower-b.lower||a.v.id.localeCompare(b.v.id));
  let best=null;
  for(const {v,lower} of candidates){
    // Straight-line distance is a lower bound, never a substitute for routing.
    // Keep numerical ties eligible so the stable ID tie-break is preserved.
    if(best&&lower>best.length+1e-8*Math.max(1,lower,best.length))break;
    const route=nav.path(departure,v.entry??v,.28,null,true);if(!route)continue;
    const length=route.reduce((sum,p,i)=>sum+distance(p,i?route[i-1]:departure),0);
    if(!best||length<best.length||length===best.length&&v.id.localeCompare(best.v.id)<0)best={v,route,length};
  }
  return best;
}
export function villageLayout(payload,x,z) {
  return payload.units.map(unit=>{
    const px=(unit.min[0]+unit.max[0])*8,pz=(unit.min[2]+unit.max[2])*8;
    const radius=Math.hypot(unit.max[0]-unit.min[0],unit.max[2]-unit.min[2])*8;
    const footprint=unit.hull?.map(([px,pz])=>({x:x+px*16,z:z+pz*16}));
    return {key:unit.key,kind:unit.kind,x:x+px,z:z+pz,radius,unit:unit.key,...(footprint?{footprint}:{})};
  });
}
export function findVillageEntry(nav,layout,x,z,destination=null,additionalObstacles=[]) {
  const oldObstacles=nav.obstacles;
  nav.obstacles=[...(oldObstacles??[]),...additionalObstacles,...layout.filter(b=>b.kind!=='Zona común').map(b=>({...b,id:`entry:${b.key}`,kind:'house'}))];nav.walkCache?.clear();
  try {
    for(let radius=0;radius<=20;radius+=2)for(let angle=0;angle<(radius?16:1);angle++){
      const point={x:x+Math.cos(angle/16*Math.PI*2)*radius,z:z+Math.sin(angle/16*Math.PI*2)*radius};
      if(nav.walkable(point.x,point.z,.28,null,true)&&(!destination||nav.path(point,destination,.28,null,true)))return point;
    }
    return null;
  }finally {nav.obstacles=oldObstacles;nav.walkCache?.clear();}
}
function* initialLocations(nav,payload) {
  // Keep candidate spacing consistent as the search expands. A fixed number of
  // rays skips most of the terrain between rays in the outer rings.
  for(let ring=0;ring<70;ring++)for(let angle=0,count=ring?Math.max(24,Math.ceil(2*Math.PI*ring)):1;angle<count;angle++) {
    yield;
    const x=Math.cos(angle/count*Math.PI*2)*ring*12+60,z=Math.sin(angle/count*Math.PI*2)*ring*12;
    const layout=villageLayout(payload,x,z);
    const checks=[];
    for(const building of layout){const check=nav.placementFootprint(building);checks.push(check);if(!check.valid)break;}
    if(checks.some(c=>!c.valid))continue;
    const center={x:x+23,z,culture:payload.id==='saheliano'?'saheliana':payload.id};
    const shape=centerFootprint(center);
    const centerCheck=nav.placementFootprint(shape);
    if(!centerCheck.valid||layout.some(b=>b.kind!=='Zona común'&&b.footprint&&footprintsOverlap(shape.footprint,b.footprint)))continue;
    let workable=0;
    const oldObstacles=nav.obstacles,oldSuppressed=nav.suppressed;
    nav.obstacles=[...(oldObstacles??[]),{id:'initial-center',kind:'center',...shape},...layout.filter(b=>b.kind!=='Zona común').map(b=>({...b,kind:'house'}))];
    nav.suppressed=new Set([...(oldSuppressed??[]),...checks.flatMap(c=>c.suppress??[]),...(centerCheck.suppress??[])]);nav.walkCache?.clear();nav.segmentCache?.clear();nav.failedPaths?.clear();nav.closedRegions?.clear();nav.portalGraphs?.clear();nav.searchedRegions=[];
    try {
      const departure=centerServicePoint(center,null,.8);
      for(let dz=-9;dz<=9&&workable<12;dz+=1.5)for(let dx=4.5;dx<=15&&workable<12;dx+=1.5){
        const point={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
        if(nav.placement(point.x,point.z,.4).valid&&nav.path(departure,point,.28,null,true)&&nav.path(point,departure,.28,null,true))workable++;
      }
    }finally{nav.obstacles=oldObstacles;nav.suppressed=oldSuppressed;nav.walkCache?.clear();nav.segmentCache?.clear();nav.failedPaths?.clear();nav.closedRegions?.clear();nav.portalGraphs?.clear();nav.searchedRegions=[];}
    if(workable<12)continue;
    const entry=findVillageEntry(nav,layout,x,z,centerServicePoint(center,null,.8),[{id:'initial-center',kind:'center',...shape}]);
    if(entry)return {x,z,buildings:layout,center,entry,suppress:[...new Set(checks.flatMap(c=>c.suppress??[]))]};
  }
  throw new Error('No se encontró una distribución inicial transitable; vuelve a generar la semilla.');
}
export function findInitialLocation(nav,payload) {
  const search=initialLocations(nav,payload);let result;
  do {result=search.next();}while(!result.done);
  return result.value;
}
export async function findInitialLocationAsync(nav,payload) {
  const search=initialLocations(nav,payload);let deadline=performance.now()+8;
  while(true){
    const result=search.next();if(result.done)return result.value;
    if(performance.now()>=deadline){await new Promise(resolve=>setTimeout(resolve,0));deadline=performance.now()+8;}
  }
}

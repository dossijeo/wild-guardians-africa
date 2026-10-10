import {canyonLandAccessSteps} from './canyon-land-access.js';
import {TerrainField,canyonFrame} from './terrain.js';
import {villageTerrainSite} from './settlement-terrain.js';
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
// Keep each native unit at its authored scale, rotating wide houses along the river.
export function canyonVillageLayout(payload,field,z) {
  const rows=[z,z],layout=[];
  for(const [i,unit] of payload.units.entries()){
    const side=i%2?-1:1,index=side===1?0:1;
    const width=(unit.max[0]-unit.min[0])*16,depth=(unit.max[2]-unit.min[2])*16;
    const yaw=width>depth?Math.PI/2:0,hx=Math.min(width,depth)/2,hz=Math.max(width,depth)/2;
    const bz=rows[index]+hz;rows[index]=bz+hz+3;
    let edge=0;
    for(let dz=-hz-1;dz<=hz+1;dz+=.5)edge=Math.max(edge,side*(field.riverX(bz+dz)-field.riverX(bz))+canyonFrame(field,bz+dz,side).waterHalf+.9);
    const x=field.riverX(bz)+side*(edge+hx+1.25),c=Math.cos(yaw),n=Math.sin(yaw);
    const cx=(unit.min[0]+unit.max[0])*8,cz=(unit.min[2]+unit.max[2])*8;
    const hull=unit.hull??[[unit.min[0],unit.min[2]],[unit.max[0],unit.min[2]],[unit.max[0],unit.max[2]],[unit.min[0],unit.max[2]]];
    const footprint=hull.map(([px,pz])=>{const dx=px*16-cx,dz=pz*16-cz;return {x:x+dx*c+dz*n,z:bz-dx*n+dz*c};});
    layout.push({key:unit.key,kind:unit.kind,x,z:bz,radius:Math.hypot(hx,hz),unit:unit.key,yaw,footprint});
  }
  return {buildings:layout,endZ:Math.max(...rows)};
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
function* initialLocations(nav,payload,legacy=false) {
  const originalField=nav.field;
  // Keep candidate spacing consistent as the search expands. A fixed number of
  // rays skips most of the terrain between rays in the outer rings.
  for(let ring=0;ring<70;ring++)for(let angle=0,count=ring?Math.max(24,Math.ceil(2*Math.PI*ring)):1;angle<count;angle++) {
    yield;
    let x=Math.cos(angle/count*Math.PI*2)*ring*12+60,z=Math.sin(angle/count*Math.PI*2)*ring*12;
    const canyon=!legacy&&originalField?.canyon;
    if(canyon){z=(ring*24+angle*12)-30;x=originalField.riverX(z);}
    const banks=canyon?canyonVillageLayout(payload,originalField,z):null;
    const layout=banks?.buildings??villageLayout(payload,x,z);
    const centerZ=banks?banks.endZ+10:z;
    const center={kind:'center',x:banks?originalField.riverX(centerZ)+13:x+23,z:centerZ,culture:payload.id==='saheliano'?'saheliana':payload.id};
    if(banks){
      const local=centerFootprint({...center,x:0,z:0}).footprint;
      center.x=Math.max(...local.map(p=>originalField.riverX(center.z+p.z)+canyonFrame(originalField,center.z+p.z).waterHalf+1.25-p.x));
    }
    // Validate paths and the future farm on the same padded map we will save.
    // Choosing an entry first and levelling later can change mangrove habitats
    // and place a new prop over the previously accepted route.
    let terrainSite;
    if(!legacy&&originalField instanceof TerrainField){
      terrainSite=villageTerrainSite({x,z,buildings:[...layout,centerFootprint(center)]},originalField);
      nav.config.settlementSite=terrainSite;nav.field=new TerrainField(nav.config);nav.chunks.clear();
      nav.walkCache.clear();nav.segmentCache.clear();nav.failedPaths.clear();nav.closedRegions.clear();nav.portalGraphs?.clear();
    }
    const checks=[];
    for(const building of layout){const check=nav.placementFootprint(building);checks.push(check);if(!check.valid)break;}
    if(checks.some(c=>!c.valid))continue;
    const shape=centerFootprint(center);
    const centerCheck=nav.placementFootprint(shape);
    if(!centerCheck.valid||layout.some(b=>b.kind!=='Zona común'&&b.footprint&&footprintsOverlap(shape.footprint,b.footprint)))continue;
    let workable=0,landAccess=null;const farmPoints=[];
    const oldObstacles=nav.obstacles,oldSuppressed=nav.suppressed;
    nav.obstacles=[...(oldObstacles??[]),{id:'initial-center',kind:'center',...shape},...layout.filter(b=>b.kind!=='Zona común').map(b=>({...b,kind:'house'}))];
    nav.suppressed=new Set([...(oldSuppressed??[]),...checks.flatMap(c=>c.suppress??[]),...(centerCheck.suppress??[])]);nav.walkCache?.clear();nav.segmentCache?.clear();nav.failedPaths?.clear();nav.closedRegions?.clear();nav.portalGraphs?.clear();nav.searchedRegions=[];
    try {
      const departure=centerServicePoint(center,null,.8);
      for(let dz=-9;dz<=9&&(workable<12||canyon&&!landAccess);dz+=1.5)for(let dx=4.5;dx<=15&&(workable<12||canyon&&!landAccess);dx+=1.5){
        const point={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
        if(nav.placement(point.x,point.z,.4).valid&&nav.path(departure,point,.28,null,true)&&nav.path(point,departure,.28,null,true)){workable++;farmPoints.push(point);if(canyon&&workable>=12&&!landAccess)landAccess=yield* canyonLandAccessSteps(nav,[point],{fastOnly:true});}
      }
      if(canyon&&workable>=12&&!landAccess)landAccess=yield* canyonLandAccessSteps(nav,farmPoints);
    }finally{nav.obstacles=oldObstacles;nav.suppressed=oldSuppressed;nav.walkCache?.clear();nav.segmentCache?.clear();nav.failedPaths?.clear();nav.closedRegions?.clear();nav.portalGraphs?.clear();nav.searchedRegions=[];}
    if(workable<12||canyon&&!landAccess)continue;
    const entry=findVillageEntry(nav,layout,x,z,centerServicePoint(center,null,.8),[{id:'initial-center',kind:'center',...shape}]);
    if(entry)return {x,z,buildings:layout,center,entry,...(terrainSite?{terrainSite}:{}),suppress:[...new Set(checks.flatMap(c=>c.suppress??[]))]};
  }
  throw new Error('No se encontró una distribución inicial transitable; vuelve a generar la semilla.');
}
export function findInitialLocation(nav,payload,{legacy=false}={}) {
  const search=initialLocations(nav,payload,legacy);let result;
  do {result=search.next();}while(!result.done);
  return result.value;
}
export async function findInitialLocationAsync(nav,payload,{legacy=false}={}) {
  const search=initialLocations(nav,payload,legacy);let deadline=performance.now()+8;
  while(true){
    const result=search.next();if(result.done)return result.value;
    if(performance.now()>=deadline){await new Promise(resolve=>setTimeout(resolve,0));deadline=performance.now()+8;}
  }
}

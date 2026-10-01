export function villageLayout(payload,x,z) {
  return payload.units.map(unit=>{
    const px=(unit.min[0]+unit.max[0])*8,pz=(unit.min[2]+unit.max[2])*8;
    const radius=Math.hypot(unit.max[0]-unit.min[0],unit.max[2]-unit.min[2])*8;
    const footprint=unit.hull?.map(([px,pz])=>({x:x+px*16,z:z+pz*16}));
    return {key:unit.key,kind:unit.kind,x:x+px,z:z+pz,radius,unit:unit.key,...(footprint?{footprint}:{})};
  });
}
export function findVillageEntry(nav,layout,x,z,destination=null) {
  const oldObstacles=nav.obstacles;
  nav.obstacles=[...(oldObstacles??[]),...layout.filter(b=>b.kind!=='Zona común').map(b=>({...b,id:`entry:${b.key}`,kind:'house'}))];nav.walkCache?.clear();
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
    const center={x:x+23,z};
    if(!nav.placement(center.x,center.z,2.6).valid)continue;
    let workable=0;
    for(let dz=-6;dz<=6;dz+=1.5)for(let dx=5;dx<=12;dx+=1.5)if(nav.placement(center.x+dx,center.z+dz,.4).valid)workable++;
    if(workable<12)continue;
    const entry=findVillageEntry(nav,layout,x,z,{x:center.x+3.4,z:center.z});
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

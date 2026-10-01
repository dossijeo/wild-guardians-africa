export function villageLayout(payload,x,z) {
  return payload.units.map(unit=>{
    const px=(unit.min[0]+unit.max[0])*8,pz=(unit.min[2]+unit.max[2])*8;
    const radius=Math.hypot(unit.max[0]-unit.min[0],unit.max[2]-unit.min[2])*8;
    return {key:unit.key,kind:unit.kind,x:x+px,z:z+pz,radius,unit:unit.key};
  });
}
export function findInitialLocation(nav,payload) {
  // Keep candidate spacing consistent as the search expands. A fixed number of
  // rays skips most of the terrain between rays in the outer rings.
  for(let ring=0;ring<70;ring++)for(let angle=0,count=ring?Math.max(24,Math.ceil(2*Math.PI*ring)):1;angle<count;angle++) {
    const x=Math.cos(angle/count*Math.PI*2)*ring*12+60,z=Math.sin(angle/count*Math.PI*2)*ring*12;
    const layout=villageLayout(payload,x,z);
    if(layout.some(b=>!nav.placement(b.x,b.z,b.radius).valid))continue;
    const center={x:x+23,z};
    if(!nav.placement(center.x,center.z,2.6).valid)continue;
    let workable=0;
    for(let dz=-6;dz<=6;dz+=1.5)for(let dx=5;dx<=12;dx+=1.5)if(nav.placement(center.x+dx,center.z+dz,.4).valid)workable++;
    if(workable<12)continue;
    const oldObstacles=nav.obstacles;
    nav.obstacles=[...oldObstacles,...layout.filter(b=>b.kind!=='Zona común').map(b=>({...b,id:`initial:${b.key}`,kind:'house'}))];nav.walkCache.clear();
    let entry=null;
    for(let radius=0;radius<=20&&!entry;radius+=2)for(let angle=0;angle<(radius?16:1);angle++){
      const point={x:x+Math.cos(angle/16*Math.PI*2)*radius,z:z+Math.sin(angle/16*Math.PI*2)*radius};
      if(nav.walkable(point.x,point.z,.28,null,true)&&nav.path(point,{x:center.x+3.4,z:center.z},.28,null,true)){entry=point;break;}
    }
    nav.obstacles=oldObstacles;nav.walkCache.clear();
    if(entry)return {x,z,buildings:layout,center,entry};
  }
  throw new Error('No se encontró una distribución inicial transitable; vuelve a generar la semilla.');
}

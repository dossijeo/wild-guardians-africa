export function villageLayout(payload,x,z) {
  return payload.units.map(unit=>{
    const px=(unit.min[0]+unit.max[0])*8,pz=(unit.min[2]+unit.max[2])*8;
    const radius=Math.hypot(unit.max[0]-unit.min[0],unit.max[2]-unit.min[2])*8;
    return {key:unit.key,kind:unit.kind,x:x+px,z:z+pz,radius,unit:unit.key};
  });
}
export function findInitialLocation(nav,payload) {
  for(let ring=0;ring<70;ring++)for(let angle=0;angle<(ring?24:1);angle++) {
    const x=Math.cos(angle/24*Math.PI*2)*ring*12+60,z=Math.sin(angle/24*Math.PI*2)*ring*12;
    const layout=villageLayout(payload,x,z);
    if(layout.some(b=>!nav.placement(b.x,b.z,b.radius).valid))continue;
    const center={x:x+23,z};
    if(!nav.placement(center.x,center.z,2.6).valid)continue;
    let workable=0;
    for(let dz=-6;dz<=6;dz+=1.5)for(let dx=5;dx<=12;dx+=1.5)if(nav.placement(center.x+dx,center.z+dz,.4).valid)workable++;
    if(workable>=12&&nav.path({x:x+1,z:z+1},center,.28,null,true))return {x,z,buildings:layout,center};
  }
  throw new Error('No se encontró una distribución inicial transitable; vuelve a generar la semilla.');
}

import {fluidAt,FLUID_PLACEMENT_REASON} from '../fluid-placement.js';
import {footprintDistance} from '../footprints.js';
import {centerFootprint} from '../centers.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const solidProp=prop=>prop.slot<4||(prop.slot>=10&&prop.slot<=12)||prop.slot>=18;

// Placement uses the native terrain and resident prop records. Gameplay still
// owns the decision to spend money, suppress props and create the crop.
export function createSpatialPlacement(session,state,propsAt){
  if(!session?.field||!Array.isArray(state?.structures)||!Array.isArray(state?.villages))
    throw TypeError('Expected a spatial session and live game state');
  const field=session.field;
  return function placement(x,z,radius=1,{ignoreWalls=false}={}){
    if(![x,z,radius].every(Number.isFinite)||radius<0)
      return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    const samples=[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]];
    for(const [dx,dz] of samples){
      const px=x+dx,pz=z+dz;
      const surface=(sx,sz)=>field.canyon?
        Math.max(field.surface(sx,sz),field.riverLevel):field.surface(sx,sz);
      const slope=field.canyon?
        Math.hypot(surface(px+.8,pz)-surface(px-.8,pz),
          surface(px,pz+.8)-surface(px,pz-.8))/1.6:field.slope(px,pz);
      if(!Number.isFinite(slope)||slope>.5)
        return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    }
    if(samples.some(([dx,dz])=>fluidAt(field,x+dx,z+dz)))
      return {valid:false,fluid:true,reason:FLUID_PLACEMENT_REASON};
    const point={x,z};
    const obstacles=[...state.structures.filter(item=>item.status!=='ruined')
      .map(item=>item.kind==='center'?centerFootprint(item,state):{...item,radius:.7}),
      ...state.villages.flatMap(village=>(village.buildings??[])
        .filter(item=>item.kind!=='Zona común')
        .map(item=>({...item,radius:item.radius??2.8})))];
    if(obstacles.some(item=>!(ignoreWalls&&item.kind==='wall')&&
      (item.footprint?footprintDistance(item.footprint,x,z)<radius:
        distance(item,point)<item.radius+radius)))
      return {valid:false,reason:'La construcción solapa otro edificio'};
    // propsAt fails closed for nonresident chunks; an unseen rock cannot be
    // interpreted as vacant farmland.
    const props=propsAt(x,z,radius+4);
    if(props.some(prop=>solidProp(prop)&&distance(prop,point)<
      (prop.radius??1.5)+radius))
      return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
    return {valid:true,suppress:props.filter(prop=>distance(prop,point)<
      radius+(prop.radius??.5)).map(prop=>prop.id)};
  };
}

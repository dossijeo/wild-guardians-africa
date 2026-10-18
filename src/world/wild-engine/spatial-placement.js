import {fluidAt,footprintFluidSample,FLUID_PLACEMENT_REASON} from '../fluid-placement.js';
import {containsPoint,footprintDistance,footprintsOverlap} from '../footprints.js';
import {centerFootprint} from '../centers.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const solidProp=prop=>prop.slot<4||(prop.slot>=10&&prop.slot<=12)||prop.slot>=18;

// Placement uses the native terrain and resident prop records. Gameplay still
// owns the decision to spend money, suppress props and create the crop.
export function createSpatialPlacement(session,state,propsAt){
  if(!session?.field||!Array.isArray(state?.structures)||!Array.isArray(state?.villages))
    throw TypeError('Expected a spatial session and live game state');
  const field=session.field;
  const terrainValid=(x,z,radius=0)=>{
    for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
      const px=x+dx,pz=z+dz;
      const surface=(sx,sz)=>field.canyon?
        Math.max(field.surface(sx,sz),field.riverLevel):field.surface(sx,sz);
      const slope=field.canyon?
        Math.hypot(surface(px+.8,pz)-surface(px-.8,pz),
          surface(px,pz+.8)-surface(px,pz-.8))/1.6:field.slope(px,pz);
      if(!Number.isFinite(slope)||slope>.5)return false;
    }
    return true;
  };
  const obstacles=()=>[...state.structures.filter(item=>item.status!=='ruined')
    .map(item=>item.kind==='center'?centerFootprint(item,state):{...item,radius:.7}),
    ...state.villages.flatMap(village=>(village.buildings??[])
      .filter(item=>item.kind!=='Zona común')
      .map(item=>({...item,radius:item.radius??2.8})))];
  function placement(x,z,radius=1,{ignoreWalls=false}={}){
    if(![x,z,radius].every(Number.isFinite)||radius<0)
      return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    const samples=[[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]];
    if(!terrainValid(x,z,radius))
      return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    if(samples.some(([dx,dz])=>fluidAt(field,x+dx,z+dz)))
      return {valid:false,fluid:true,reason:FLUID_PLACEMENT_REASON};
    const point={x,z};
    if(obstacles().some(item=>!(ignoreWalls&&item.kind==='wall')&&
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
  }
  function wallPlacement(wall){
    const scale=wall.gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[wall.material]??1):1;
    const half=1.09*(wall.baseScaleX??1)*scale,depth=.22*scale;
    if(![wall.x,wall.z,wall.yaw??0,half].every(Number.isFinite)||half<=0)
      return {valid:false,reason:'Trazado de muralla inválido'};
    const c=Math.cos(wall.yaw??0),s=Math.sin(wall.yaw??0),points=[];
    const steps=Math.max(1,Math.ceil(half*2/.35));
    for(let i=0;i<=steps;i++)for(const dz of [-depth,0,depth]){
      const dx=-half+half*2*i/steps;
      points.push({x:wall.x+dx*c+dz*s,z:wall.z-dx*s+dz*c});
    }
    if(points.every(point=>fluidAt(field,point.x,point.z)))
      return {valid:false,fluid:true,reason:FLUID_PLACEMENT_REASON};
    if(obstacles().some(item=>item.kind!=='wall'&&points.every(point=>
      item.footprint?footprintDistance(item.footprint,point.x,point.z)<1e-8:
        distance(item,point)<=item.radius)))
      return {valid:false,reason:'La muralla queda dentro de un edificio'};
    const props=propsAt(wall.x,wall.z,half+depth+4),suppressed=new Set();
    for(const point of points){
      if(props.some(prop=>solidProp(prop)&&distance(prop,point)<
        (prop.radius??1.5)+.05))
        return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
      for(const prop of props)if(distance(prop,point)<(prop.radius??.5)+.05)
        suppressed.add(prop.id);
    }
    return {valid:true,suppress:[...suppressed]};
  }
  function placementFootprint(building){
    const polygon=building.footprint;
    if(!polygon?.length)return placement(building.x,building.z,building.radius);
    if(footprintFluidSample(field,polygon))
      return {valid:false,fluid:true,reason:FLUID_PLACEMENT_REASON};
    const base=field.surface(building.x,building.z);
    const terrainPoint=point=>terrainValid(point.x,point.z)&&
      (building.kind!=='center'||!Number.isFinite(base)||
        Math.abs(field.surface(point.x,point.z)-base)<=.12);
    const terrainFailure={valid:false,reason:building.kind==='center'?
      'El edificio necesita suelo nivelado en toda su base':
      'Agua, lava o pendiente no edificable'};
    if(!polygon.every(terrainPoint))return terrainFailure;
    const xs=polygon.map(point=>point.x),zs=polygon.map(point=>point.z);
    const minX=Math.min(...xs),maxX=Math.max(...xs),
      minZ=Math.min(...zs),maxZ=Math.max(...zs);
    for(let x=minX;x<=maxX;x+=.5)for(let z=minZ;z<=maxZ;z+=.5)
      if(containsPoint(polygon,x,z)&&!terrainPoint({x,z}))return terrainFailure;
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],steps=Math.ceil(distance(a,b));
      for(let j=1;j<steps;j++)if(!terrainPoint({
        x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps}))return terrainFailure;
    }
    if(obstacles().some(item=>item.footprint?
      footprintsOverlap(polygon,item.footprint):
      footprintDistance(polygon,item.x,item.z)<item.radius))
      return {valid:false,reason:'La construcción solapa otro edificio'};
    const reach=Math.max(...polygon.map(point=>distance(point,building)))+4;
    const props=propsAt(building.x,building.z,reach);
    if(props.some(prop=>solidProp(prop)&&footprintDistance(polygon,prop.x,prop.z)<
      (prop.radius??1.5)))
      return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
    return {valid:true,suppress:props.filter(prop=>
      footprintDistance(polygon,prop.x,prop.z)<(prop.radius??.5))
      .map(prop=>prop.id)};
  }
  return {placement,wallPlacement,placementFootprint};
}

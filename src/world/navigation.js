import {TerrainField,scatterWorld} from './terrain.js';
import {containsPoint,footprintDistance,footprintsOverlap,edgeDistance,sweptFootprintDistance} from './footprints.js';
export const BIOME_IDS={sabana:'savanna','gran-rio':'grand_river',manglares:'mangrove',volcanes:'volcanoes','gran-canon':'canyons',desierto:'desert'};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Navigation {
  constructor(seed,biome,profile) {
    this.config={seed:String(seed),biome:BIOME_IDS[biome]??biome,relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:[true,true,true,true,true,true]};
    this.field=new TerrainField(this.config);this.profile=profile;this.chunks=new Map();this.obstacles=[];this.suppressed=new Set();this.walkCache=new Map();
  }
  chunk(cx,cz) {
    const key=`${cx},${cz}`;
    if(!this.chunks.has(key)) {
      const chunk=scatterWorld({...this.config,cx,cz},this.profile,this.field);
      this.chunks.set(key,chunk);
      if(this.chunks.size>64)this.chunks.delete(this.chunks.keys().next().value);
    }
    return this.chunks.get(key);
  }
  propsAt(x,z,radius) {
    const result=[];
    const minX=Math.floor((x-radius+24)/48),maxX=Math.floor((x+radius+24)/48);
    const minZ=Math.floor((z-radius+24)/48),maxZ=Math.floor((z+radius+24)/48);
    for(let cz=minZ;cz<=maxZ;cz++)for(let cx=minX;cx<=maxX;cx++)for(const list of this.chunk(cx,cz).instances)for(const p of list)if(distance(p,{x,z})<radius+8&&!this.suppressed.has(p.id))result.push(p);
    return result;
  }
  setState(state) {
    this.version=(this.version??0)+1;
    this.walkCache.clear();
    this.suppressed=new Set(state.suppressed);
    this.obstacles=state.structures.filter(s=>s.status!=='ruined').map(s=>({...s,radius:s.kind==='center'?2.6:.7}));
    for(const v of state.villages)for(const b of v.buildings??[])if(b.kind!=='Zona común')this.obstacles.push({...b,id:`${v.id}:${b.key}`,radius:b.radius??2.8,kind:'house'});
    for(const area of state.spells)if(area.kind==='shield'&&area.remaining>0)this.obstacles.push({...area,kind:'shield'});
  }
  terrainValid(x,z,radius=.3) {
    for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]) {
      if(this.field.blocked(x+dx,z+dz,.15)||this.field.slope(x+dx,z+dz)>.5)return false;
    }
    return true;
  }
  walkable(x,z,radius=.3,ignore=null,worker=false) {
    const exact=Number.isInteger(x)&&Number.isInteger(z),key=`${x},${z}:${radius}:${ignore}:${worker}`;
    if(exact&&this.walkCache.has(key))return this.walkCache.get(key);
    const result=this.testWalkable(x,z,radius,ignore,worker);
    if(exact){if(this.walkCache.size>50000)this.walkCache.clear();this.walkCache.set(key,result);}
    return result;
  }
  testWalkable(x,z,radius=.3,ignore=null,worker=false) {
    if(!this.terrainValid(x,z,radius))return false;
    if(this.obstacles.some(o=>{
      if(o.id===ignore||worker&&(o.gate||o.kind==='shield'))return false;
      if(o.kind==='wall'){
        const dx=x-o.x,dz=z-o.z,c=Math.cos(o.yaw??0),s=Math.sin(o.yaw??0);
        const localX=dx*c-dz*s,localZ=dx*s+dz*c;
        const width=o.gate?1.09*(o.material==='reforzado'?1.6:['adobe','piedra'].includes(o.material)?1.4:1):1.09;
        return Math.abs(localX)<width+radius&&Math.abs(localZ)<.22+radius;
      }
      if(o.footprint)return footprintDistance(o.footprint,x,z)<radius;
      return distance(o,{x,z})<o.radius+radius;
    }))return false;
    return !this.propsAt(x,z,radius+4).some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&distance(p,{x,z})<(p.radius??1.5)+radius);
  }
  placement(x,z,radius=1) {
    if(!Number.isFinite(x)||!Number.isFinite(z)||!this.terrainValid(x,z,radius))return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    if(this.obstacles.some(o=>o.footprint?footprintDistance(o.footprint,x,z)<radius:distance(o,{x,z})<o.radius+radius))return {valid:false,reason:'La construcción solapa otro edificio'};
    const props=this.propsAt(x,z,radius+4);
    if(props.some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&distance(p,{x,z})<(p.radius??1.5)+radius))return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
    return {valid:true,suppress:props.filter(p=>distance(p,{x,z})<radius+(p.radius??.5)).map(p=>p.id)};
  }
  placementFootprint(building) {
    const polygon=building.footprint;
    if(!polygon?.length)return this.placement(building.x,building.z,building.radius);
    const terrainPoint=p=>this.terrainValid(p.x,p.z,0);
    if(!polygon.every(terrainPoint))return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    const xs=polygon.map(p=>p.x),zs=polygon.map(p=>p.z);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    // Sample the occupied interior and edges, rather than the empty corners of
    // a bounding circle. Native hull coordinates use the same scale as render.
    for(let x=minX;x<=maxX;x+=1)for(let z=minZ;z<=maxZ;z+=1)if(containsPoint(polygon,x,z)&&!this.terrainValid(x,z,0))return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],steps=Math.ceil(distance(a,b));
      for(let j=1;j<steps;j++)if(!terrainPoint({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps}))return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    }
    if(this.obstacles.some(o=>o.footprint?footprintsOverlap(polygon,o.footprint):footprintDistance(polygon,o.x,o.z)<o.radius))return {valid:false,reason:'La construcción solapa otro edificio'};
    const props=this.propsAt(building.x,building.z,building.radius+4);
    if(props.some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&footprintDistance(polygon,p.x,p.z)<(p.radius??1.5)))return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
    return {valid:true,suppress:props.filter(p=>footprintDistance(polygon,p.x,p.z)<(p.radius??.5)).map(p=>p.id)};
  }
  path(start,end,radius=.3,ignore=null,worker=true) {
    if(!this.walkable(end.x,end.z,radius,ignore,worker))return null;
    if(this.segmentClear(start,end,radius,ignore,worker))return [{x:end.x,z:end.z}];
    // A* on a local corridor. Search bounds are a technical route limit, not world bounds.
    const cell=1,key=(x,z)=>`${x},${z}`,sx=Math.round(start.x),sz=Math.round(start.z),ex=Math.round(end.x),ez=Math.round(end.z);
    const margin=16,minX=Math.min(sx,ex)-margin,maxX=Math.max(sx,ex)+margin,minZ=Math.min(sz,ez)-margin,maxZ=Math.max(sz,ez)+margin;
    const open=[],costs=new Map(),previous=new Map();
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const point={x:sx+dx,z:sz+dz};
      if(!this.walkable(point.x,point.z,radius,ignore,worker)||!this.segmentClear(start,point,radius,ignore,worker))continue;
      const g=distance(start,point);open.push({...point,g,f:g+Math.hypot(ex-point.x,ez-point.z)});costs.set(key(point.x,point.z),g);
    }
    let visited=0;
    while(open.length&&visited++<12000) {
      open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=key(cur.x,cur.z);
      if(Math.hypot(cur.x-ex,cur.z-ez)<1.5&&this.segmentClear(cur,end,radius,ignore,worker)) {
        const route=[{x:end.x,z:end.z}];let k=ck;
        while(true){const [x,z]=k.split(',').map(Number);route.push({x:x*cell,z:z*cell});if(!previous.has(k))break;k=previous.get(k);}
        return route.reverse();
      }
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
        const x=cur.x+dx,z=cur.z+dz;
        if(x<minX||x>maxX||z<minZ||z>maxZ||!this.walkable(x,z,radius,ignore,worker))continue;
        if(dx&&dz&&(!this.walkable(cur.x+dx,cur.z,radius,ignore,worker)||!this.walkable(cur.x,cur.z+dz,radius,ignore,worker)))continue;
        const k=key(x,z),g=cur.g+Math.hypot(dx,dz);
        if(g>=(costs.get(k)??Infinity))continue;
        if(!this.segmentClear(cur,{x,z},radius,ignore,worker))continue;
        costs.set(k,g);previous.set(k,ck);open.push({x,z,g,f:g+Math.hypot(ex-x,ez-z)});
      }
    }
    return null;
  }
  segmentClear(start,end,radius,ignore,worker) {
    for(const obstacle of this.obstacles){
      if(obstacle.id===ignore||worker&&(obstacle.gate||obstacle.kind==='shield'))continue;
      if(obstacle.kind==='wall'){
        const width=(obstacle.gate?1.09*(obstacle.material==='reforzado'?1.6:['adobe','piedra'].includes(obstacle.material)?1.4:1):1.09)+radius;
        const depth=.22+radius,c=Math.cos(obstacle.yaw??0),s=Math.sin(obstacle.yaw??0);
        const polygon=[[-width,-depth],[width,-depth],[width,depth],[-width,depth]].map(([x,z])=>({x:obstacle.x+x*c+z*s,z:obstacle.z-x*s+z*c}));
        if(sweptFootprintDistance(start,end,polygon)<1e-9)return false;
      }else if(obstacle.footprint){
        if(sweptFootprintDistance(start,end,obstacle.footprint)<radius)return false;
      }else if(edgeDistance(start,end,obstacle.x,obstacle.z)<obstacle.radius+radius)return false;
    }
    const midpoint={x:(start.x+end.x)/2,z:(start.z+end.z)/2};
    if(this.propsAt(midpoint.x,midpoint.z,distance(start,end)/2+radius+4).some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&edgeDistance(start,end,p.x,p.z)<(p.radius??1.5)+radius))return false;
    const steps=Math.max(1,Math.ceil(distance(start,end)/.25));
    for(let i=0;i<=steps;i++)if(!this.terrainValid(start.x+(end.x-start.x)*i/steps,start.z+(end.z-start.z)*i/steps,radius))return false;
    return true;
  }
}

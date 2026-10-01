import {TerrainField,scatterWorld} from './terrain.js';
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
    this.walkCache.clear();
    this.suppressed=new Set(state.suppressed);
    this.obstacles=state.structures.filter(s=>s.status!=='ruined').map(s=>({...s,radius:s.kind==='center'?2.6:.7}));
    for(const v of state.villages)for(const b of v.buildings??[])this.obstacles.push({...b,id:`${v.id}:${b.key}`,radius:b.radius??2.8,kind:'house'});
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
    if(this.obstacles.some(o=>o.id!==ignore&&!(worker&&o.gate)&&distance(o,{x,z})<o.radius+radius))return false;
    return !this.propsAt(x,z,radius+4).some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&distance(p,{x,z})<(p.radius??1.5)+radius);
  }
  placement(x,z,radius=1) {
    if(!Number.isFinite(x)||!Number.isFinite(z)||!this.terrainValid(x,z,radius))return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    if(this.obstacles.some(o=>distance(o,{x,z})<o.radius+radius))return {valid:false,reason:'La construcción solapa otro edificio'};
    const props=this.propsAt(x,z,radius+4);
    if(props.some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&distance(p,{x,z})<(p.radius??1.5)+radius))return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
    return {valid:true,suppress:props.filter(p=>distance(p,{x,z})<radius+(p.radius??.5)).map(p=>p.id)};
  }
  path(start,end,radius=.3,ignore=null,worker=true) {
    const directSteps=Math.ceil(distance(start,end)/.6);
    let clear=true;
    for(let i=1;i<directSteps;i++)if(!this.walkable(start.x+(end.x-start.x)*i/directSteps,start.z+(end.z-start.z)*i/directSteps,radius,ignore,worker)){clear=false;break;}
    if(clear)return [{x:end.x,z:end.z}];
    // A* on a local corridor. Search bounds are a technical route limit, not world bounds.
    const cell=1,key=(x,z)=>`${x},${z}`,sx=Math.round(start.x),sz=Math.round(start.z),ex=Math.round(end.x),ez=Math.round(end.z);
    const margin=16,minX=Math.min(sx,ex)-margin,maxX=Math.max(sx,ex)+margin,minZ=Math.min(sz,ez)-margin,maxZ=Math.max(sz,ez)+margin;
    const open=[{x:sx,z:sz,g:0,f:Math.hypot(ex-sx,ez-sz)}],costs=new Map([[key(sx,sz),0]]),previous=new Map();
    let visited=0;
    while(open.length&&visited++<12000) {
      open.sort((a,b)=>a.f-b.f);const cur=open.shift(),ck=key(cur.x,cur.z);
      if(Math.hypot(cur.x-ex,cur.z-ez)<1.5) {
        const route=[{x:end.x,z:end.z}];let k=ck;
        while(previous.has(k)){const [x,z]=k.split(',').map(Number);route.push({x:x*cell,z:z*cell});k=previous.get(k);}
        return route.reverse();
      }
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
        const x=cur.x+dx,z=cur.z+dz;
        if(x<minX||x>maxX||z<minZ||z>maxZ||!this.walkable(x,z,radius,ignore,worker))continue;
        if(dx&&dz&&(!this.walkable(cur.x+dx,cur.z,radius,ignore,worker)||!this.walkable(cur.x,cur.z+dz,radius,ignore,worker)))continue;
        const k=key(x,z),g=cur.g+Math.hypot(dx,dz);
        if(g>=(costs.get(k)??Infinity))continue;
        costs.set(k,g);previous.set(k,ck);open.push({x,z,g,f:g+Math.hypot(ex-x,ez-z)});
      }
    }
    return null;
  }
}

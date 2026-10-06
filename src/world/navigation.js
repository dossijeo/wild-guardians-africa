import {fluidAt,footprintFluidSample,FLUID_PLACEMENT_REASON} from './fluid-placement.js';
import {navigationBounds,outsideNavigationBounds} from './navigation-bounds.js';
import {navigationPathKey} from './raid-navigation-warmth.js';
import {navigationQueryResult,rememberNavigationQuery} from './navigation-query-scope.js';
import {villageTerrainSite} from './settlement-terrain.js';
import {centerFootprint} from './centers.js';
import {TerrainField,scatterWorld} from './terrain.js';
import {containsPoint,footprintDistance,footprintsOverlap,edgeDistance,sweptFootprintDistance} from './footprints.js';
import {SearchFrontier} from './search-frontier.js';
import {gateFrameFootprints,gateSwingPolygon,gatePortalPoints} from './gate-passages.js';
import {validActiveBounds} from './active-region.js';
export const BIOME_IDS={sabana:'savanna','gran-rio':'grand_river',manglares:'mangrove',volcanes:'volcanoes','gran-canon':'canyons',desierto:'desert'};
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class Navigation {
  constructor(seed,biome,profile) {
    this.config={seed:String(seed),biome:BIOME_IDS[biome]??biome,relief:1,density:1,river:true,n:1,cx:0,cz:0,layers:[true,true,true,true,true,true]};
    this.field=new TerrainField(this.config);this.profile=profile;this.chunks=new Map();this.obstacles=[];this.suppressed=new Set();this.walkCache=new Map();this.segmentCache=new Map();this.failedPaths=new Set();this.closedRegions=new Map();this.searchedRegions=[];this.searchNeighborCache=new Map();
  }
  setActiveBounds(bounds){
    if(!validActiveBounds(bounds))throw new RangeError('Invalid active terrain bounds');
    // Presentation metadata: changing it must not invalidate logical routes,
    // existing animals, reservations or their persisted spawn points.
    if(this.activeBounds?.every((value,i)=>value===bounds[i]))return;
    this.activeBounds=[...bounds];
  }
  setRaidView(eye,target){
    if(![eye?.x,eye?.z,target?.x,target?.z].every(Number.isFinite))return;
    this.raidView={eye:{x:eye.x,z:eye.z},target:{x:target.x,z:target.z}};
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
    // New worlds persist their platform once. Legacy saves retain their original
    // relief and prop IDs; adding a visual material never migrates their terrain.
    if(state.terrainVersion==='4.1.10.3'&&this.field instanceof TerrainField){
      const village=state.villages[0];
      if(village&&!village.terrainSite)village.terrainSite=villageTerrainSite(village,this.field);
      const site=village?.terrainSite;
      if(site&&JSON.stringify(this.config.settlementSite)!==JSON.stringify(site)){
        this.config.settlementSite=structuredClone(site);this.field=new TerrainField(this.config);this.chunks.clear();
      }
    }
    // A fresh navigator must share the saved route epoch. Rebuilding the same
    // world is not a geometry change: recomputing a persisted local actor
    // detour can otherwise select different waypoints immediately after load.
    // Legacy saves have no epoch and conservatively invalidate their routes.
    const restored=this.version===undefined&&Number.isSafeInteger(state.navigationVersion)&&state.navigationVersion>0;
    this.version=restored?state.navigationVersion:(this.version??0)+1;
    state.navigationVersion=this.version;
    this.state=state;
    this.portalGraphs=new Map();
    this.preparedPaths=null;
    this.walkCache.clear();
    this.segmentCache.clear();
    this.failedPaths.clear();
    this.closedRegions.clear();
    this.searchedRegions=[];this.searchNeighborCache=new Map();
    this.suppressed=new Set(state.suppressed);
    this.obstacles=state.structures.filter(s=>s.status!=='ruined').map(s=>s.kind==='center'?centerFootprint(s,state):({...s,radius:.7}));
    for(const v of state.villages)for(const b of v.buildings??[])if(b.kind!=='Zona común')this.obstacles.push({...b,id:`${v.id}:${b.key}`,radius:b.radius??2.8,kind:'house'});
    for(const area of state.spells)if(area.kind==='shield'&&area.remaining>0)this.obstacles.push({...area,kind:'shield'});
    this.obstacleBounds=new WeakMap(this.obstacles.map(o=>[o,navigationBounds(o)]));
  }
  syncCropPlacement(state,removedProps=[]) {
    // Crops are not navigation obstacles. Replanting already cleared ground
    // can retain static-query caches and the obstacle index. Keep the existing
    // route epoch change so worker replanning and saved route behaviour match
    // the established simulation. Real prop removals still rebuild normally.
    if(this.state!==state||removedProps.length){this.setState(state);return;}
    this.version=(this.version??0)+1;
    state.navigationVersion=this.version;
  }
  forBuildingPlacement(building,suppress=[]) {
    // Route the proposed footprint without polluting live paths or caches.
    return Object.assign(Object.create(this),{
      obstacles:[...this.obstacles,building],suppressed:new Set([...(this.suppressed??[]),...suppress]),
      preparedPaths:null,walkCache:new Map(),segmentCache:new Map(),failedPaths:new Set(),closedRegions:new Map(),searchedRegions:[],portalGraphs:new Map(),searchNeighborCache:new Map(),
    });
  }
  workerSurface(x,z){
    const ground=this.field.surface(x,z);
    return this.field.canyon?Math.max(ground,this.field.riverLevel):ground;
  }
  actorSurface(x,z){
    const ground=this.field.surface(x,z),water=this.field.canyon&&this.field.waterInfo(x,z);
    return water?.inside?Math.max(ground,water.level-.10):ground;
  }
  terrainValid(x,z,radius=.3,worker=false,allowFluid=false) {
    for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]) {
      if(!allowFluid&&!this.field.canyon&&fluidAt(this.field,x+dx,z+dz))return false;
      if(this.field.canyon){
        const surface=(px,pz)=>this.workerSurface(px,pz);
        if(Math.hypot(surface(x+dx+.8,z+dz)-surface(x+dx-.8,z+dz),surface(x+dx,z+dz+.8)-surface(x+dx,z+dz-.8))/1.6>.5)return false;
      }else if(this.field.slope(x+dx,z+dz)>.5)return false;
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
    if(!this.terrainValid(x,z,radius,worker))return false;
    const point={x,z};
    if(this.obstacles.some(o=>{
      if(o.id===ignore||worker&&o.kind==='shield')return false;
      if(outsideNavigationBounds(point,point,this.obstacleBounds?.get(o),radius))return false;
      if(worker&&o.gate){const frames=gateFrameFootprints(o);return frames?frames.some(p=>footprintDistance(p,x,z)<radius):false;}
      if(o.kind==='wall'){
        const dx=x-o.x,dz=z-o.z,c=Math.cos(o.yaw??0),s=Math.sin(o.yaw??0);
        const localX=dx*c-dz*s,localZ=dx*s+dz*c;
        const scale=o.gate?(o.material==='reforzado'?1.6:['adobe','piedra'].includes(o.material)?1.4:1):1,width=1.09*(o.baseScaleX??1)*scale;
        return Math.abs(localX)<width+radius&&Math.abs(localZ)<.22*scale+radius;
      }
      if(o.footprint)return footprintDistance(o.footprint,x,z)<radius;
      return distance(o,point)<o.radius+radius;
    }))return false;
    return !this.propsAt(x,z,radius+4).some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&distance(p,point)<(p.radius??1.5)+radius);
  }
  placement(x,z,radius=1,{ignoreWalls=false}={}) {
    if(!Number.isFinite(x)||!Number.isFinite(z)||!this.terrainValid(x,z,radius,false,true))return {valid:false,reason:'Agua, lava o pendiente no edificable'};
    if([[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].some(([dx,dz])=>fluidAt(this.field,x+dx,z+dz)))return {valid:false,fluid:true,reason:FLUID_PLACEMENT_REASON};
    if(this.obstacles.some(o=>o.kind!=='shield'&&!(ignoreWalls&&o.kind==='wall')&&(o.footprint?footprintDistance(o.footprint,x,z)<radius:distance(o,{x,z})<o.radius+radius)))return {valid:false,reason:'La construcción solapa otro edificio'};
    const props=this.propsAt(x,z,radius+4);
    if(props.some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&distance(p,{x,z})<(p.radius??1.5)+radius))return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
    return {valid:true,suppress:props.filter(p=>distance(p,{x,z})<radius+(p.radius??.5)).map(p=>p.id)};
  }
  wallPlacement(wall) {
    const scale=wall.gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[wall.material]??1):1,half=1.09*(wall.baseScaleX??1)*scale,depth=.22*scale,c=Math.cos(wall.yaw),s=Math.sin(wall.yaw),suppressed=new Set();
    if(![wall.x,wall.z,wall.yaw??0,half].every(Number.isFinite))return {valid:false,reason:'Trazado de muralla inválido'};
    const points=[],steps=Math.max(1,Math.ceil(half*2/.35));
    for(let i=0;i<=steps;i++)for(const dz of [-depth,0,depth]){
      const dx=-half+half*2*i/steps;points.push({x:wall.x+dx*c+dz*s,z:wall.z-dx*s+dz*c});
    }
    if(points.every(p=>fluidAt(this.field,p.x,p.z)))return {valid:false,fluid:true,reason:FLUID_PLACEMENT_REASON};
    if(this.obstacles.some(o=>o.kind!=='shield'&&o.kind!=='wall'&&points.every(p=>o.footprint?footprintDistance(o.footprint,p.x,p.z)<1e-8:distance(o,p)<=o.radius)))return {valid:false,reason:'La muralla queda dentro de un edificio'};
    for(const p of points){const props=this.propsAt(p.x,p.z,4);
      if(props.some(prop=>(prop.slot<4||prop.slot>=10&&prop.slot<=12||prop.slot>=18)&&distance(prop,p)<(prop.radius??1.5)+.05))return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
      for(const prop of props)if(distance(prop,p)<(prop.radius??.5)+.05)suppressed.add(prop.id);
    }
    return {valid:true,suppress:[...suppressed]};
  }
  placementFootprint(building) {
    const polygon=building.footprint;
    if(!polygon?.length)return this.placement(building.x,building.z,building.radius);
    if(footprintFluidSample(this.field,polygon))return {valid:false,fluid:true,reason:FLUID_PLACEMENT_REASON};
    const base=this.field?.surface?.(building.x,building.z);
    // The native floor is horizontal at the center anchor. Validate its whole
    // occupied area, including shallow slopes that pass the walking limit.
    // Fluid occupancy was checked against the actual surface above.
    const terrainPoint=p=>this.terrainValid(p.x,p.z,0,false,true)&&(building.kind!=='center'||!Number.isFinite(base)||Math.abs(this.field.surface(p.x,p.z)-base)<=.12);
    const terrainFailure={valid:false,reason:building.kind==='center'?'El edificio necesita suelo nivelado en toda su base':'Agua, lava o pendiente no edificable'};
    if(!polygon.every(terrainPoint))return terrainFailure;
    const xs=polygon.map(p=>p.x),zs=polygon.map(p=>p.z);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    // Sample the occupied interior and edges, rather than the empty corners of
    // a bounding circle. Native hull coordinates use the same scale as render.
    for(let x=minX;x<=maxX;x+=.5)for(let z=minZ;z<=maxZ;z+=.5)if(containsPoint(polygon,x,z)&&!terrainPoint({x,z}))return terrainFailure;
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],steps=Math.ceil(distance(a,b));
      for(let j=1;j<steps;j++)if(!terrainPoint({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps}))return terrainFailure;
    }
    if(this.obstacles.some(o=>o.kind!=='shield'&&(o.footprint?footprintsOverlap(polygon,o.footprint):footprintDistance(polygon,o.x,o.z)<o.radius)))return {valid:false,reason:'La construcción solapa otro edificio'};
    const props=this.propsAt(building.x,building.z,building.radius+4);
    if(props.some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&footprintDistance(polygon,p.x,p.z)<(p.radius??1.5)))return {valid:false,reason:'Un árbol o roca grande ocupa este terreno'};
    return {valid:true,suppress:props.filter(p=>footprintDistance(polygon,p.x,p.z)<(p.radius??.5)).map(p=>p.id)};
  }
  path(start,end,radius=.3,ignore=null,worker=true,margin=16) {
    const key=navigationPathKey(start,end,radius,ignore,worker,margin);
    if(this.failedPaths.has(key))return null;
    const prepared=this.preparedPaths&&this.preparedPaths.version===this.version&&this.preparedPaths.entries.get(key);
    if(prepared)return prepared.map(p=>({...p}));
    const reused=navigationQueryResult(this,key);if(reused)return reused;
    const found=this.findPath(start,end,radius,ignore,worker,margin);
    const result=found&&worker?this.smoothPath(start,found,radius,ignore,worker):found;
    if(!result){if(this.failedPaths.size>=50000)this.failedPaths.clear();this.failedPaths.add(key);}
    if(result)rememberNavigationQuery(this,key,result);
    return result;
  }
  smoothPath(start,path,radius,ignore,worker){
    const route=[];let anchor=start,index=0;
    while(index<path.length){
      let next=index;
      // Bound shortcut checks. Routes are computed only on destination or
      // obstacle changes, never per rendered frame; collision tests are shared.
      for(let j=Math.min(path.length-1,index+32);j>index;j--)if(this.segmentClear(anchor,path[j],radius,ignore,worker)){next=j;break;}
      anchor=path[next];route.push(anchor);index=next+1;
    }
    return route;
  }
  approachPath(start,end,radius){
    // Animal routes have symmetric terrain/solid collision rules. Search from
    // the service point: an enclosed island then proves failure after exploring
    // its finite component, rather than repeatedly exploring the outer land.
    const reverse=this.path(end,start,radius,null,false);
    if(!reverse)return null;
    return [...reverse.slice(0,-1).reverse(),{x:end.x,z:end.z}];
  }
  portalGraph(radius,ignore){
    this.portalGraphs??=new Map();const cacheKey=`${radius}:${ignore}`;
    if(this.portalGraphs.has(cacheKey))return this.portalGraphs.get(cacheKey);
    const nodes=new Map(),links=new Map(),key=p=>`${p.x},${p.z}`;
    for(const gate of this.obstacles.filter(o=>o.gate&&o.id!==ignore)){
      const points=gatePortalPoints(gate,radius);if(points.length!==2)continue;
      for(let i=0;i<2;i++){
        const point=points[i],node={...point,neighbors:[points[1-i]]};
        for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
          const grid={x:Math.round(point.x)+dx,z:Math.round(point.z)+dz};node.neighbors.push(grid);
          const gridKey=key(grid);if(!links.has(gridKey))links.set(gridKey,[]);links.get(gridKey).push(point);
        }
        nodes.set(key(point),node);
      }
    }
    const graph={nodes,links};this.portalGraphs.set(cacheKey,graph);return graph;
  }
  searchNeighbors(cur,radius,ignore,worker,portals) {
    const ck=`${cur.x},${cur.z}`,cacheKey=`${ck}:${radius}:${ignore}:${worker}`,cache=this.searchNeighborCache;
    if(cache?.has(cacheKey))return cache.get(cacheKey);
    const extras=portals.nodes.get(ck)?.neighbors??portals.links.get(ck)??[];
    const points=portals.nodes.has(ck)?extras:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]].map(([dx,dz])=>({x:cur.x+dx,z:cur.z+dz,gridStep:true})).concat(extras);
    if(!cache)return points;
    const neighbors=points.map(p=>({x:p.x,z:p.z,gridStep:p.gridStep,key:`${p.x},${p.z}`,length:Math.hypot(p.x-cur.x,p.z-cur.z),walkable:undefined}));
    // Bound transient graph memory; no routes or destinations are persisted here.
    if(cache.size>=4096)cache.delete(cache.keys().next().value);cache.set(cacheKey,neighbors);
    return neighbors;
  }
  findPath(start,end,radius=.3,ignore=null,worker=true,margin=16) {
    const search=this.findPathSteps(start,end,radius,ignore,worker,margin);let step;
    do{step=search.next();}while(!step.done);return step.value;
  }
  *findPathSteps(start,end,radius=.3,ignore=null,worker=true,margin=16) {
    if(!this.walkable(end.x,end.z,radius,ignore,worker))return null;
    if(this.segmentClear(start,end,radius,ignore,worker))return [{x:end.x,z:end.z}];
    // A* on a local corridor. Search bounds are a technical route limit, not world bounds.
    const cell=1,key=(x,z)=>`${x},${z}`,sx=Math.round(start.x),sz=Math.round(start.z),ex=Math.round(end.x),ez=Math.round(end.z);
    const maxVisited=12000*Math.max(1,(margin/16)**2),minX=Math.min(sx,ex)-margin,maxX=Math.max(sx,ex)+margin,minZ=Math.min(sz,ez)-margin,maxZ=Math.max(sz,ez)+margin;
    const portals=worker?this.portalGraph(radius,ignore):{nodes:new Map(),links:new Map()},inside=p=>p.x>=minX&&p.x<=maxX&&p.z>=minZ&&p.z<=maxZ;
    const open=new SearchFrontier(),costs=new Map(),previous=new Map();
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const point={x:sx+dx,z:sz+dz};
      if(!this.walkable(point.x,point.z,radius,ignore,worker)||!this.segmentClear(start,point,radius,ignore,worker))continue;
      const g=distance(start,point);open.push({...point,g,f:g+Math.hypot(ex-point.x,ez-point.z)});costs.set(key(point.x,point.z),g);
    }
    for(const point of portals.nodes.values())if(inside(point)&&distance(start,point)<=4&&this.walkable(point.x,point.z,radius,ignore,worker)&&this.segmentClear(start,point,radius,ignore,worker)){
      const g=distance(start,point);open.push({...point,g,f:g+Math.hypot(ex-point.x,ez-point.z)});costs.set(key(point.x,point.z),g);
    }
    const regionKey=k=>`${radius}:${ignore}:${worker}|${k}`;
    const reachesEnd=region=>{
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const point={x:ex+dx,z:ez+dz};
        if(region.has(key(point.x,point.z))&&this.segmentClear(point,end,radius,ignore,worker))return true;
      }
      for(const point of portals.nodes.values())if(distance(point,end)<=4&&region.has(key(point.x,point.z))&&this.segmentClear(point,end,radius,ignore,worker))return true;
      return false;
    };
    // An exhausted bounded search also proves failures for contained corridors,
    // provided every new origin connector belongs to its explored region.
    for(const searched of this.searchedRegions){
      if(searched.radius!==radius||searched.ignore!==ignore||searched.worker!==worker||
        minX<searched.minX||maxX>searched.maxX||minZ<searched.minZ||maxZ>searched.maxZ)continue;
      if(open.length&&open.values().every(p=>searched.nodes.has(key(p.x,p.z)))&&!reachesEnd(searched.nodes))return null;
    }
    const known=open.values().map(p=>this.closedRegions.get(regionKey(key(p.x,p.z))));
    if(known.length&&known.every(Boolean)){
      if(![...new Set(known)].some(reachesEnd))return null;
    }
    let visited=0,touchesBoundary=false;
    while(open.length&&visited++<maxVisited) {
      if(visited%8===0)yield null;
      const cur=open.pop(),ck=key(cur.x,cur.z);
      // A cheaper entry for this cell has already been processed. Keep the
      // original pop budget, but avoid repeating its collision/neighbor work.
      if(cur.g>costs.get(ck))continue;
      if(cur.x===minX||cur.x===maxX||cur.z===minZ||cur.z===maxZ)touchesBoundary=true;
      if((Math.hypot(cur.x-ex,cur.z-ez)<1.5||portals.nodes.has(ck)&&distance(cur,end)<=4)&&this.segmentClear(cur,end,radius,ignore,worker)) {
        const route=[{x:end.x,z:end.z}];let k=ck;
        while(true){const [x,z]=k.split(',').map(Number);route.push({x:x*cell,z:z*cell});if(!previous.has(k))break;k=previous.get(k);}
        return route.reverse();
      }
      const neighbors=this.searchNeighbors(cur,radius,ignore,worker,portals);
      for(const point of neighbors){
        const {x,z}=point,dx=x-cur.x,dz=z-cur.z;
        if(!inside(point)){if(!point.gridStep)touchesBoundary=true;continue;}
        // Resolve collision lazily, only for neighbors inside this search corridor.
        // The result is shared across searches in the same navigation epoch.
        const walkable=point.walkable??(this.walkable(x,z,radius,ignore,worker)&&!(point.gridStep&&dx&&dz&&(!this.walkable(cur.x+dx,cur.z,radius,ignore,worker)||!this.walkable(cur.x,cur.z+dz,radius,ignore,worker))));
        if(this.searchNeighborCache)point.walkable=walkable;
        if(!walkable)continue;
        const k=point.key??key(x,z),g=cur.g+(point.length??Math.hypot(dx,dz));
        if(g>=(costs.get(k)??Infinity))continue;
        if(!this.segmentClear(cur,{x,z},radius,ignore,worker))continue;
        costs.set(k,g);previous.set(k,ck);open.push({x,z,g,f:g+Math.hypot(ex-x,ez-z)});
      }
    }
    // Only an exhaustive search wholly inside the corridor proves a finite,
    // closed grid region. Time/bounds limited failures never prove isolation.
    if(!open.length&&visited<maxVisited&&costs.size){
      const region=new Set(costs.keys());
      while(this.searchedRegions.length&&(this.searchedRegions.length>=32||this.searchedRegions.reduce((sum,r)=>sum+r.nodes.size,0)+region.size>50000))this.searchedRegions.shift();
      this.searchedRegions.push({nodes:region,minX,maxX,minZ,maxZ,radius,ignore,worker});
      if(!touchesBoundary){
        if(this.closedRegions.size+costs.size>50000)this.closedRegions.clear();
        for(const k of region)this.closedRegions.set(regionKey(k),region);
      }
    }
    return null;
  }
  segmentClear(start,end,radius,ignore,worker) {
    // Repeated A* searches share exact directed grid edges. Geometry remains
    // unchanged until setState invalidates both navigation caches.
    const grid=[start.x,start.z,end.x,end.z].every(Number.isInteger);
    const from=`${start.x},${start.z}`,to=`${end.x},${end.z}`;
    const key=grid?`${from}|${to}:${radius}:${ignore}:${worker}`:null;
    if(key&&this.segmentCache.has(key))return this.segmentCache.get(key);
    const result=this.testSegmentClear(start,end,radius,ignore,worker);
    if(key){if(this.segmentCache.size>=100000)this.segmentCache.clear();this.segmentCache.set(key,result);}
    return result;
  }
  workerMotionClear(start,end,radius=.28){
    if(!this.segmentClear(start,end,radius,null,true))return false;
    for(const gate of this.state?.structures??this.obstacles){
      if(!gate.gate||gate.status==='ruined')continue;
      const frames=gateFrameFootprints(gate,gate.status==='collapsing'?0:gate.gateOpen??0);
      if(frames?.some(p=>sweptFootprintDistance(start,end,p)<radius))return false;
      const opening=gate.gateOpen??0;
      if(opening>0&&opening<1){const area=gateSwingPolygon(gate);if(area&&sweptFootprintDistance(start,end,area)<radius)return false;}
    }
    return true;
  }
  testSegmentClear(start,end,radius,ignore,worker) {
    for(const obstacle of this.obstacles){
      if(obstacle.id===ignore||worker&&obstacle.kind==='shield')continue;
      if(outsideNavigationBounds(start,end,this.obstacleBounds?.get(obstacle),radius))continue;
      if(worker&&obstacle.gate){const frames=gateFrameFootprints(obstacle);if(frames?.some(p=>sweptFootprintDistance(start,end,p)<radius))return false;continue;}
      if(obstacle.kind==='wall'){
        const scale=obstacle.gate?(obstacle.material==='reforzado'?1.6:['adobe','piedra'].includes(obstacle.material)?1.4:1):1,width=1.09*(obstacle.baseScaleX??1)*scale+radius;
        const depth=.22*scale+radius,c=Math.cos(obstacle.yaw??0),s=Math.sin(obstacle.yaw??0);
        const polygon=[[-width,-depth],[width,-depth],[width,depth],[-width,depth]].map(([x,z])=>({x:obstacle.x+x*c+z*s,z:obstacle.z-x*s+z*c}));
        if(sweptFootprintDistance(start,end,polygon)<1e-9)return false;
      }else if(obstacle.footprint){
        if(sweptFootprintDistance(start,end,obstacle.footprint)<radius)return false;
      }else if(edgeDistance(start,end,obstacle.x,obstacle.z)<obstacle.radius+radius)return false;
    }
    const midpoint={x:(start.x+end.x)/2,z:(start.z+end.z)/2};
    if(this.propsAt(midpoint.x,midpoint.z,distance(start,end)/2+radius+4).some(p=>(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)&&edgeDistance(start,end,p.x,p.z)<(p.radius??1.5)+radius))return false;
    const steps=Math.max(1,Math.ceil(distance(start,end)/.25));
    for(let i=0;i<=steps;i++)if(!this.terrainValid(start.x+(end.x-start.x)*i/steps,start.z+(end.z-start.z)*i/steps,radius,worker))return false;
    return true;
  }
}

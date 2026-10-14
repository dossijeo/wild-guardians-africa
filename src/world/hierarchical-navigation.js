import {SearchFrontier} from './search-frontier.js';

// Logical navigation owns its sector components and graph. Geometry is sampled
// only while a sector or a cross-sector edge is built; movement remains 3D.
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const opposite=[1,0,3,2];
const sectorKey=(x,z)=>`${x},${z}`;
const nodeKey=(sx,sz,id)=>`${sx},${sz}:${id}`;
const length=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class HierarchicalNavigator {
  constructor({cellPassable,edgePassable,connectorClear,portals=()=>[],sectorSize=12,maxGraphNodes=2048}={}){
    if(typeof cellPassable!=='function'||typeof edgePassable!=='function'||typeof connectorClear!=='function')throw Error('Hierarchical navigation requires physical sampling functions');
    this.cellPassable=cellPassable;this.edgePassable=edgePassable;this.connectorClear=connectorClear;this.portals=portals;
    this.sectorSize=sectorSize;this.maxGraphNodes=maxGraphNodes;this.profiles=new Map();this.portalGraphs=new Map();
    this.metrics={sectorsBuilt:0,sectorsInvalidated:0,cellSamples:0,edgeSamples:0,graphSearches:0,graphNodes:0,localSearches:0};
  }
  clear(){this.profiles.clear();this.portalGraphs.clear();}
  profile(id){let map=this.profiles.get(id);if(!map)this.profiles.set(id,map=new Map());return map;}
  coordinates(x,z){return {sx:Math.floor(x/this.sectorSize),sz:Math.floor(z/this.sectorSize)};}
  invalidateRect(minX,minZ,maxX,maxZ){
    this.portalGraphs.clear();
    const a=this.coordinates(Math.floor(minX)-1,Math.floor(minZ)-1),b=this.coordinates(Math.ceil(maxX)+1,Math.ceil(maxZ)+1);
    for(const map of this.profiles.values()){
      for(let sz=a.sz;sz<=b.sz;sz++)for(let sx=a.sx;sx<=b.sx;sx++)if(map.delete(sectorKey(sx,sz)))this.metrics.sectorsInvalidated++;
      // A neighbor's portal edges refer to the changed sector. Its local
      // components remain valid, but its outgoing graph edges do not.
      for(let sz=a.sz-1;sz<=b.sz+1;sz++)for(let sx=a.sx-1;sx<=b.sx+1;sx++){
        const neighbor=map.get(sectorKey(sx,sz));if(neighbor)neighbor.edges.clear();
      }
    }
  }
  sector(profile,sx,sz){
    const map=this.profile(profile),key=sectorKey(sx,sz),cached=map.get(key);if(cached)return cached;
    const size=this.sectorSize,n=size*size,pass=new Uint8Array(n),steps=new Uint8Array(n),component=new Int16Array(n),components=[];
    component.fill(-1);
    const x0=sx*size,z0=sz*size,at=(x,z)=>z*size+x;
    for(let z=0;z<size;z++)for(let x=0;x<size;x++){
      this.metrics.cellSamples++;if(this.cellPassable(x0+x,z0+z,profile))pass[at(x,z)]=1;
    }
    for(let z=0;z<size;z++)for(let x=0;x<size;x++){
      const i=at(x,z);if(!pass[i])continue;
      for(let d=0;d<4;d++){
        const nx=x+DIRS[d][0],nz=z+DIRS[d][1];
        if(nx<0||nx>=size||nz<0||nz>=size||!pass[at(nx,nz)])continue;
        this.metrics.edgeSamples++;
        if(this.edgePassable({x:x0+x,z:z0+z},{x:x0+nx,z:z0+nz},profile))steps[i]|=1<<d;
      }
    }
    for(let z=0;z<size;z++)for(let x=0;x<size;x++){
      const seed=at(x,z);if(!pass[seed]||component[seed]>=0)continue;
      const id=components.length,cells=[],queue=[seed];component[seed]=id;
      for(let head=0;head<queue.length;head++){
        const current=queue[head],cx=current%size,cz=Math.floor(current/size);cells.push(current);
        for(let d=0;d<4;d++){
          const nx=cx+DIRS[d][0],nz=cz+DIRS[d][1];
          if(nx<0||nx>=size||nz<0||nz>=size)continue;
          const ni=at(nx,nz);
          // Either direction may connect cells in the logical region. The
          // final local route still follows directed edges only.
          if(component[ni]<0&&pass[ni]&&((steps[current]&(1<<d))||(steps[ni]&(1<<opposite[d])))){
            component[ni]=id;queue.push(ni);
          }
        }
      }
      components.push(cells);
    }
    const result={sx,sz,x0,z0,pass,steps,component,components,edges:new Map()};map.set(key,result);this.metrics.sectorsBuilt++;
    return result;
  }
  location(profile,cell){
    const {sx,sz}=this.coordinates(cell.x,cell.z),sector=this.sector(profile,sx,sz),x=cell.x-sector.x0,z=cell.z-sector.z0;
    if(x<0||z<0||x>=this.sectorSize||z>=this.sectorSize)return null;
    const id=sector.component[z*this.sectorSize+x];return id<0?null:{sector,id,key:nodeKey(sx,sz,id)};
  }
  connector(point,profile,outward){
    const x=Math.round(point.x),z=Math.round(point.z),candidates=[];
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const cell={x:x+dx,z:z+dz},loc=this.location(profile,cell);if(!loc)continue;
      if(this.connectorClear(outward?point:cell,outward?cell:point,profile))candidates.push({cell,loc,distance:length(point,cell)});
    }
    candidates.sort((a,b)=>a.distance-b.distance||a.cell.x-b.cell.x||a.cell.z-b.cell.z);
    return candidates;
  }
  portalGraph(profile){
    if(this.portalGraphs.has(profile))return this.portalGraphs.get(profile);
    const graph=new Map();
    for(const portal of this.portals(profile))for(const [a,b] of [[portal.from,portal.to],[portal.to,portal.from]]){
      if(!this.connectorClear(a,b,profile))continue;
      const source=this.connector(a,profile,false)[0],target=this.connector(b,profile,true)[0];
      if(!source||!target)continue;
      const edge={from:source.cell,to:target.cell,target:target.loc,via:[a,b],cost:length(source.cell,a)+length(a,b)+length(b,target.cell)};
      if(!graph.has(source.loc.key))graph.set(source.loc.key,[]);
      graph.get(source.loc.key).push(edge);
    }
    this.portalGraphs.set(profile,graph);return graph;
  }
  neighbors(profile,loc){
    const sector=loc.sector,cached=sector.edges.get(loc.id);
    if(cached)return cached.concat(this.portalGraph(profile).get(loc.key)??[]);
    const edges=[];
    for(const i of sector.components[loc.id]){
      const x=i%this.sectorSize,z=Math.floor(i/this.sectorSize);
      for(let d=0;d<4;d++){
        const nx=x+DIRS[d][0],nz=z+DIRS[d][1];
        if(nx>=0&&nx<this.sectorSize&&nz>=0&&nz<this.sectorSize)continue;
        const from={x:sector.x0+x,z:sector.z0+z},to={x:from.x+DIRS[d][0],z:from.z+DIRS[d][1]};
        const target=this.location(profile,to);if(!target)continue;
        this.metrics.edgeSamples++;
        if(this.edgePassable(from,to,profile))edges.push({from,to,target,cost:1});
      }
    }
    sector.edges.set(loc.id,edges);return edges.concat(this.portalGraph(profile).get(loc.key)??[]);
  }
  abstractPath(profile,start,end,bounds){
    if(start.key===end.key)return [];
    this.metrics.graphSearches++;
    const frontier=new SearchFrontier(),cost=new Map([[start.key,0]]),previous=new Map(),visited=new Set();
    frontier.push({loc:start,g:0,f:length({x:start.sector.x0,z:start.sector.z0},{x:end.sector.x0,z:end.sector.z0})});
    while(frontier.length&&visited.size<this.maxGraphNodes){
      const current=frontier.pop();if(visited.has(current.loc.key))continue;
      visited.add(current.loc.key);this.metrics.graphNodes++;
      if(current.loc.key===end.key){
        const route=[];let key=end.key;
        while(key!==start.key){const entry=previous.get(key);if(!entry)return null;route.push(entry.edge);key=entry.parent;}
        return route.reverse();
      }
      for(const edge of this.neighbors(profile,current.loc)){
        const next=edge.target,{sx,sz}=next.sector;
        if(sx<bounds.minSX||sx>bounds.maxSX||sz<bounds.minSZ||sz>bounds.maxSZ)continue;
        const g=current.g+edge.cost;if(g>= (cost.get(next.key)??Infinity))continue;
        cost.set(next.key,g);previous.set(next.key,{parent:current.loc.key,edge});
        frontier.push({loc:next,g,f:g+Math.hypot(sx-end.sector.sx,sz-end.sector.sz)});
      }
    }
    return null;
  }
  localPath(profile,sector,start,end){
    this.metrics.localSearches++;
    if(start.x===end.x&&start.z===end.z)return [];
    const size=this.sectorSize,index=p=>(p.z-sector.z0)*size+p.x-sector.x0,source=index(start),goal=index(end);
    if(source<0||goal<0||source>=size*size||goal>=size*size)return null;
    const parent=new Int16Array(size*size),queue=[source];parent.fill(-1);parent[source]=source;
    for(let head=0;head<queue.length;head++){
      const i=queue[head];if(i===goal)break;
      const x=i%size,z=Math.floor(i/size);
      for(let d=0;d<4;d++){
        if(!(sector.steps[i]&(1<<d)))continue;
        const nx=x+DIRS[d][0],nz=z+DIRS[d][1],ni=nz*size+nx;
        if(parent[ni]<0){parent[ni]=i;queue.push(ni);}
      }
    }
    if(parent[goal]<0)return null;
    const result=[];for(let i=goal;i!==source;i=parent[i])result.push({x:sector.x0+i%size,z:sector.z0+Math.floor(i/size)});
    return result.reverse();
  }
  path(start,end,profile,{margin=32}={}){
    if(this.connectorClear(start,end,profile))return [{x:end.x,z:end.z}];
    const sources=this.connector(start,profile,true),targets=this.connector(end,profile,false);
    if(!sources.length||!targets.length)return null;
    const minX=Math.min(start.x,end.x)-margin,maxX=Math.max(start.x,end.x)+margin;
    const minZ=Math.min(start.z,end.z)-margin,maxZ=Math.max(start.z,end.z)+margin;
    const a=this.coordinates(minX,minZ),b=this.coordinates(maxX,maxZ);
    const bounds={minSX:a.sx,maxSX:b.sx,minSZ:a.sz,maxSZ:b.sz};
    for(const source of sources)for(const target of targets){
      const abstract=this.abstractPath(profile,source.loc,target.loc,bounds);if(!abstract)continue;
      const route=[],append=p=>{if(!route.length||route.at(-1).x!==p.x||route.at(-1).z!==p.z)route.push(p);};
      append(source.cell);let current=source.cell,loc=source.loc,valid=true;
      for(const edge of abstract){
        const segment=this.localPath(profile,loc.sector,current,edge.from);
        if(!segment){valid=false;break;}
        for(const point of segment)append(point);
        for(const point of edge.via??[])append(point);
        append(edge.to);current=edge.to;loc=edge.target;
      }
      if(!valid)continue;
      const tail=this.localPath(profile,loc.sector,current,target.cell);if(!tail)continue;
      for(const point of tail)append(point);
      append({x:end.x,z:end.z});return route;
    }
    return null;
  }
}

// QA-only shared route tree. One animal origin searches the crop/defense
// landscape once; service points reuse its predecessors. This intentionally
// replaces per-destination A* choices, so physical outcomes must be compared.
import {SearchFrontier} from '../../src/world/search-frontier.js';
import {activeCrops} from '../../src/simulation/active-crops.js';
import {logicalAnimalGrid} from './logical-animal-grid-prototype.mjs';

export function installEnclosureRouteTree(nav,metrics={},negativeOnly=false,gridMode=false){
  const original=nav.approachPath.bind(nav),fields=[];
  Object.assign(metrics,{built:0,reused:0,visited:0,buildMilliseconds:0,treeRoutes:0,fallbacks:0,fallbackReasons:{},unreachable:0,direct:0});
  let grid=null,gridVersion=null;
  const fallback=(reason,start,end,radius,margin)=>{metrics.fallbacks++;metrics.fallbackReasons[reason]=(metrics.fallbackReasons[reason]??0)+1;return original(start,end,radius,margin);};
  nav.approachPath=(start,end,radius,margin=32)=>{
    if(!nav.state?.raid)return fallback('inactive',start,end,radius,margin);
    if(gridMode&&gridVersion!==nav.version){grid=logicalAnimalGrid(nav,metrics.grid={});gridVersion=nav.version;}
    if(!nav.walkable(end.x,end.z,radius,null,false)){metrics.unreachable++;return null;}
    if(nav.segmentClear(start,end,radius,null,false)){metrics.direct++;return [{x:end.x,z:end.z}];}
    const sx=Math.round(start.x),sz=Math.round(start.z),same=f=>f.version===nav.version&&f.radius===radius&&f.startX===start.x&&f.startZ===start.z;
    let field=fields.find(same);
    if(field)metrics.reused++;
    else{
      const targets=[...activeCrops(nav.state.plants),...nav.state.structures.filter(s=>s.status!=='ruined')];
      if(!targets.length)return fallback('no-targets',start,end,radius,margin);
      let minX=sx,maxX=sx,minZ=sz,maxZ=sz;
      for(const t of targets){minX=Math.min(minX,Math.floor(t.x));maxX=Math.max(maxX,Math.ceil(t.x));minZ=Math.min(minZ,Math.floor(t.z));maxZ=Math.max(maxZ,Math.ceil(t.z));}
      minX-=margin+5;maxX+=margin+5;minZ-=margin+5;maxZ+=margin+5;
      const width=maxX-minX+1,height=maxZ-minZ+1;
      if(width*height>100000)return fallback('oversized',start,end,radius,margin);
      const began=performance.now(),size=width*height,cost=new Float64Array(size),previous=new Int32Array(size),walk=new Int8Array(size),frontier=new SearchFrontier();
      cost.fill(Infinity);previous.fill(-1);
      const index=(x,z)=>(z-minZ)*width+x-minX;
      const pass=(x,z)=>{const i=index(x,z);return walk[i]||(walk[i]=(grid?grid.walkable(x,z,radius):nav.walkable(x,z,radius,null,false))?1:-1);};
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const x=sx+dx,z=sz+dz;if(x<minX||x>maxX||z<minZ||z>maxZ||pass(x,z)!==1||!nav.segmentClear(start,{x,z},radius,null,false))continue;
        const i=index(x,z),g=Math.hypot(x-start.x,z-start.z);if(g>=cost[i])continue;cost[i]=g;frontier.push({x,z,i,g,f:g});
      }
      const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
      let visited=0;
      while(frontier.length){
        const cur=frontier.pop();if(cur.g>cost[cur.i])continue;
        if(++visited>30000)break;
        for(let direction=0;direction<directions.length;direction++){
          const [dx,dz]=directions[direction];
          const x=cur.x+dx,z=cur.z+dz;if(x<minX||x>maxX||z<minZ||z>maxZ||pass(x,z)!==1)continue;
          if(!grid&&dx&&dz&&(pass(cur.x+dx,cur.z)!==1||pass(cur.x,cur.z+dz)!==1))continue;
          const i=index(x,z),g=cur.g+Math.hypot(dx,dz);if(g>=cost[i]||!(grid?grid.step(cur.x,cur.z,x,z,radius,direction):nav.segmentClear(cur,{x,z},radius,null,false)))continue;
          cost[i]=g;previous[i]=cur.i;frontier.push({x,z,i,g,f:g});
        }
      }
      field={version:nav.version,radius,startX:start.x,startZ:start.z,minX,minZ,maxX,maxZ,width,cost,previous,complete:!frontier.length};
      fields.push(field);if(fields.length>32)fields.shift();
      metrics.built++;metrics.visited+=visited;metrics.buildMilliseconds+=performance.now()-began;
    }
    let best=-1,bestCost=Infinity;const ex=Math.round(end.x),ez=Math.round(end.z);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=ex+dx,z=ez+dz;if(x<field.minX||x>field.maxX||z<field.minZ||z>field.maxZ||Math.hypot(x-end.x,z-end.z)>=1.5)continue;
      const i=(z-field.minZ)*field.width+x-field.minX,g=field.cost[i]+Math.hypot(x-end.x,z-end.z);
      if(g<bestCost&&nav.segmentClear({x,z},end,radius,null,false)){best=i;bestCost=g;}
    }
    if(best<0){
      if(field.complete){metrics.unreachable++;return null;}
      return fallback('incomplete-field',start,end,radius,margin);
    }
    if(negativeOnly)return fallback('negative-only',start,end,radius,margin);
    const route=[];let i=best;
    while(i>=0){route.push({x:field.minX+i%field.width,z:field.minZ+Math.floor(i/field.width)});i=field.previous[i];}
    route.reverse();route.push({x:end.x,z:end.z});metrics.treeRoutes++;return route;
  };
  return metrics;
}

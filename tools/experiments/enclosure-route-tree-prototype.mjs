// QA-only shared route tree. One animal origin searches the crop/defense
// landscape once; service points reuse its predecessors. This intentionally
// replaces per-destination A* choices, so physical outcomes must be compared.
import {SearchFrontier} from '../../src/world/search-frontier.js';
import {activeCrops} from '../../src/simulation/active-crops.js';
import {logicalAnimalGrid} from './logical-animal-grid-prototype.mjs';
import {breachPortalTable} from './breach-portal-prototype.mjs';

export function installEnclosureRouteTree(nav,metrics={},negativeOnly=false,gridMode=false,adaptive=false,shareOrigins=false,pruneReach=false,incremental=false,batchTargets=false){
  const original=nav.approachPath.bind(nav),fields=[];
  nav.__sharedRouteFields=fields;
  const originalReach=nav.approachReachability?.bind(nav);
  Object.assign(metrics,{built:0,reused:0,sharedOrigins:0,sharedRouteSteps:0,sharedSmoothedSteps:0,portalEdges:0,portalTraversals:0,batchQueries:0,batchPoints:0,batchRoutes:0,batchSkips:0,batchFallbacks:0,visited:0,buildMilliseconds:0,treeRoutes:0,fallbacks:0,fallbackReasons:{},unreachable:0,direct:0,nativeTrials:0,activations:0,gridRuns:[]});
  let grid=null,gridVersion=null;
  let decisionVersion=null,failedNative=0,active=!adaptive;
  const fallback=(reason,start,end,radius,margin)=>{metrics.fallbacks++;metrics.fallbackReasons[reason]=(metrics.fallbackReasons[reason]??0)+1;return original(start,end,radius,margin);};
  if(batchTargets)nav.sharedCropSelection=(actor,groups,accept)=>{
    metrics.batchQueries++;
    const findField=()=>fields.find(f=>f.version===nav.version&&f.radius===actor.radius&&f.complete&&
      (()=>{
        const sx=Math.round(actor.x),sz=Math.round(actor.z);
        for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
          const x=sx+dx,z=sz+dz;
          if(x<f.minX||x>f.maxX||z<f.minZ||z>f.maxZ)continue;
          if(Number.isFinite(f.cost[(z-f.minZ)*f.width+x-f.minX])&&nav.segmentClear(actor,{x,z},actor.radius,null,false))return true;
        }
        return false;
      })());
    let field=findField();
    if(!field){
      outer:for(const group of groups)for(const target of [...group.targets].sort((a,b)=>Math.hypot(a.x-actor.x,a.z-actor.z)-Math.hypot(b.x-actor.x,b.z-actor.z)||a.id.localeCompare(b.id))){
        if(nav.state.spells?.some(sp=>sp.kind==='shield'&&sp.remaining>0&&Math.hypot(sp.x-target.x,sp.z-target.z)<=sp.radius))continue;
        const reach=.6+actor.radius,angle=Math.atan2(actor.x-target.x,actor.z-target.z);
        for(let sample=0;sample<32;sample++){
          const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/16;
          const point={id:`approach-${target.id}-direct-${sample}`,x:target.x+Math.sin(angle+offset)*reach,z:target.z+Math.cos(angle+offset)*reach};
          if(!nav.walkable(point.x,point.z,actor.radius,null,false)||!accept(target,point))continue;
          const path=nav.approachPath(actor,point,actor.radius,32);
          if(path){metrics.batchRoutes++;return {target,approach:{point,path}};}
          break outer;
        }
      }
      field=findField();
    }
    if(!field){metrics.batchFallbacks++;return undefined;}
    for(const group of groups)for(const target of [...group.targets].sort((a,b)=>Math.hypot(a.x-actor.x,a.z-actor.z)-Math.hypot(b.x-actor.x,b.z-actor.z)||a.id.localeCompare(b.id))){
      if(nav.state.spells?.some(sp=>sp.kind==='shield'&&sp.remaining>0&&Math.hypot(sp.x-target.x,sp.z-target.z)<=sp.radius)){metrics.batchFallbacks++;return undefined;}
      const reach=.6+actor.radius,angle=Math.atan2(actor.x-target.x,actor.z-target.z);
      for(let sample=0;sample<32;sample++){
        const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/16;
        const point={id:`approach-${target.id}-direct-${sample}`,x:target.x+Math.sin(angle+offset)*reach,z:target.z+Math.cos(angle+offset)*reach};
        metrics.batchPoints++;
        if(!nav.walkable(point.x,point.z,actor.radius,null,false)||!accept(target,point))continue;
        let possible=nav.segmentClear(actor,point,actor.radius,null,false);
        if(!possible){
          const ex=Math.round(point.x),ez=Math.round(point.z);
          for(let dz=-1;dz<=1&&!possible;dz++)for(let dx=-1;dx<=1;dx++){
            const x=ex+dx,z=ez+dz;
            if(x<field.minX||x>field.maxX||z<field.minZ||z>field.maxZ)continue;
            if(Number.isFinite(field.cost[(z-field.minZ)*field.width+x-field.minX])&&nav.segmentClear({x,z},point,actor.radius,null,false))possible=true;
          }
        }
        if(!possible)continue;
        const path=nav.approachPath(actor,point,actor.radius,32);
        if(path){metrics.batchRoutes++;return {target,approach:{point,path}};}
      }
    }
    metrics.batchSkips++;return null;
  };
  if(shareOrigins&&pruneReach&&originalReach)nav.approachReachability=(start,targets,radius,margin=32)=>{
    const field=fields.find(f=>f.version===nav.version&&f.radius===radius&&f.complete&&
      (()=>{
        const sx=Math.round(start.x),sz=Math.round(start.z);
        for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
          const x=sx+dx,z=sz+dz;
          if(x<f.minX||x>f.maxX||z<f.minZ||z>f.maxZ)continue;
          const i=(z-f.minZ)*f.width+x-f.minX;
          if(Number.isFinite(f.cost[i])&&nav.segmentClear(start,{x,z},radius,null,false))return true;
        }
        return false;
      })());
    if(!field)return originalReach(start,targets,radius,margin);
    return point=>{
      if(nav.segmentClear(start,point,radius,null,false))return true;
      const ex=Math.round(point.x),ez=Math.round(point.z);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const x=ex+dx,z=ez+dz;
        if(x<field.minX||x>field.maxX||z<field.minZ||z>field.maxZ)continue;
        const i=(z-field.minZ)*field.width+x-field.minX;
        if(Number.isFinite(field.cost[i])&&nav.segmentClear({x,z},point,radius,null,false))return true;
      }
      return false;
    };
  };
  nav.approachPath=(start,end,radius,margin=32)=>{
    if(!nav.state?.raid)return fallback('inactive',start,end,radius,margin);
    if(decisionVersion!==nav.version){decisionVersion=nav.version;failedNative=0;active=!adaptive;}
    if(!active){
      const native=original(start,end,radius,margin);metrics.nativeTrials++;
      if(!native&&nav.walkable(end.x,end.z,radius,null,false)&&++failedNative>=5000){active=true;metrics.activations++;}
      if(!active||native)return native;
    }
    if(gridMode&&gridVersion!==nav.version){metrics.grid={};metrics.gridRuns.push(metrics.grid);grid=logicalAnimalGrid(nav,metrics.grid);gridVersion=nav.version;}
    if(!nav.walkable(end.x,end.z,radius,null,false)){metrics.unreachable++;return null;}
    if(nav.segmentClear(start,end,radius,null,false)){metrics.direct++;return [{x:end.x,z:end.z}];}
    const sx=Math.round(start.x),sz=Math.round(start.z),same=f=>f.version===nav.version&&f.radius===radius&&f.startX===start.x&&f.startZ===start.z;
    const origin=f=>{
      let best=-1,bestCost=Infinity;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const x=sx+dx,z=sz+dz;
        if(x<f.minX||x>f.maxX||z<f.minZ||z>f.maxZ)continue;
        const i=(z-f.minZ)*f.width+x-f.minX,g=f.cost[i]+Math.hypot(x-start.x,z-start.z);
        if(g<bestCost&&nav.segmentClear(start,{x,z},radius,null,false)){best=i;bestCost=g;}
      }
      return best;
    };
    let field=fields.find(same);
    if(!field&&shareOrigins)field=fields.find(f=>{
      if(f.version!==nav.version||f.radius!==radius)return false;
      if(incremental)f.expand(start);
      return origin(f)>=0;
    });
    if(field)metrics.reused++;
    else{
      const targets=[...activeCrops(nav.state.plants),...nav.state.structures.filter(s=>s.status!=='ruined')];
      if(!targets.length)return fallback('no-targets',start,end,radius,margin);
      let minX=sx,maxX=sx,minZ=sz,maxZ=sz;
      for(const t of targets){minX=Math.min(minX,Math.floor(t.x));maxX=Math.max(maxX,Math.ceil(t.x));minZ=Math.min(minZ,Math.floor(t.z));maxZ=Math.max(maxZ,Math.ceil(t.z));}
      minX-=margin+5;maxX+=margin+5;minZ-=margin+5;maxZ+=margin+5;
      const width=maxX-minX+1,height=maxZ-minZ+1;
      if(width*height>100000)return fallback('oversized',start,end,radius,margin);
      const began=performance.now(),size=width*height,cost=new Float64Array(size),previous=new Int32Array(size),walk=new Int8Array(size),frontier=new SearchFrontier(),edgeVia=new Map();
      cost.fill(Infinity);previous.fill(-1);
      const index=(x,z)=>(z-minZ)*width+x-minX;
      const pass=(x,z)=>{const i=index(x,z);return walk[i]||(walk[i]=(grid?grid.walkable(x,z,radius):nav.walkable(x,z,radius,null,false))?1:-1);};
      const portalLinks=new Map();
      if(shareOrigins){
        for(const portal of breachPortalTable(nav).portals)for(const entry of Object.values(portal.bySpecies)){
          if(entry.radius!==radius||entry.status!=='passable')continue;
          for(const crossing of entry.crossings)for(const [from,to] of [[crossing.from,crossing.to],[crossing.to,crossing.from]]){
            const a={x:Math.round(from.x),z:Math.round(from.z)},b={x:Math.round(to.x),z:Math.round(to.z)};
            if(a.x<minX||a.x>maxX||a.z<minZ||a.z>maxZ||b.x<minX||b.x>maxX||b.z<minZ||b.z>maxZ||
              pass(a.x,a.z)!==1||pass(b.x,b.z)!==1||!nav.segmentClear(a,from,radius,null,false)||!nav.segmentClear(to,b,radius,null,false))continue;
            const k=index(a.x,a.z),length=Math.hypot(a.x-from.x,a.z-from.z)+Math.hypot(from.x-to.x,from.z-to.z)+Math.hypot(to.x-b.x,to.z-b.z);
            if(!portalLinks.has(k))portalLinks.set(k,[]);
            portalLinks.get(k).push({x:b.x,z:b.z,length,via:[from,to]});metrics.portalEdges++;
          }
        }
      }
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        const x=sx+dx,z=sz+dz;if(x<minX||x>maxX||z<minZ||z>maxZ||pass(x,z)!==1||!nav.segmentClear(start,{x,z},radius,null,false))continue;
        const i=index(x,z),g=Math.hypot(x-start.x,z-start.z);if(g>=cost[i])continue;cost[i]=g;frontier.push({x,z,i,g,f:g});
      }
      const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
      let visited=0;
      field={version:nav.version,radius,startX:start.x,startZ:start.z,minX,minZ,maxX,maxZ,width,cost,previous,edgeVia,complete:!frontier.length,touchedBoundary:false};
      field.expand=goal=>{
        if(field.complete||visited>=30000)return;
        const goalFound=()=>{
          const ex=Math.round(goal.x),ez=Math.round(goal.z);
          for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
            const x=ex+dx,z=ez+dz;
            if(x<minX||x>maxX||z<minZ||z>maxZ||Math.hypot(x-goal.x,z-goal.z)>=1.5)continue;
            if(Number.isFinite(cost[index(x,z)])&&nav.segmentClear({x,z},goal,radius,null,false))return true;
          }
          return false;
        };
        if(incremental&&goalFound())return;
        const beganExpansion=performance.now(),before=visited;
        while(frontier.length&&visited<30000){
          const cur=frontier.pop();if(cur.g>cost[cur.i])continue;
          if(cur.x===minX||cur.x===maxX||cur.z===minZ||cur.z===maxZ)field.touchedBoundary=true;
          visited++;
          for(let direction=0;direction<directions.length;direction++){
            const [dx,dz]=directions[direction];
            const x=cur.x+dx,z=cur.z+dz;if(x<minX||x>maxX||z<minZ||z>maxZ||pass(x,z)!==1)continue;
            if(!grid&&dx&&dz&&(pass(cur.x+dx,cur.z)!==1||pass(cur.x,cur.z+dz)!==1))continue;
            const i=index(x,z),g=cur.g+Math.hypot(dx,dz);if(g>=cost[i]||!(grid?grid.step(cur.x,cur.z,x,z,radius,direction):nav.segmentClear(cur,{x,z},radius,null,false)))continue;
            cost[i]=g;previous[i]=cur.i;edgeVia.delete(i);frontier.push({x,z,i,g,f:g});
          }
          for(const link of portalLinks.get(cur.i)??[]){
            const i=index(link.x,link.z),g=cur.g+link.length;
            if(g>=cost[i])continue;
            cost[i]=g;previous[i]=cur.i;edgeVia.set(i,link.via);frontier.push({x:link.x,z:link.z,i,g,f:g});
          }
          if(incremental&&Math.hypot(cur.x-goal.x,cur.z-goal.z)<1.5&&goalFound())break;
        }
        field.complete=!frontier.length;metrics.visited+=visited-before;metrics.buildMilliseconds+=performance.now()-beganExpansion;
      };
      fields.push(field);if(fields.length>32)fields.shift();
      metrics.built++;metrics.buildMilliseconds+=performance.now()-began;
    }
    field.expand(end);
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
    let indices=[],viaSeed=false;
    if(shareOrigins&&(!same(field))){
      const actorCell=origin(field),ancestors=new Map();let i=actorCell;
      while(i>=0&&!ancestors.has(i)){ancestors.set(i,ancestors.size);i=field.previous[i];}
      const goalChain=[];i=best;
      while(i>=0&&!ancestors.has(i)){goalChain.push(i);i=field.previous[i];}
      if(i<0){
        // The original tree has up to nine roots, each joined by an exact
        // fractional segment to its common seed. They form one physical tree
        // even though previous[] alone does not encode the super-root.
        viaSeed=true;i=actorCell;
        while(i>=0){indices.push(i);i=field.previous[i];}
        indices.push(...goalChain.reverse());
      }else{
        const joint=i;i=actorCell;
        while(i!==joint){indices.push(i);i=field.previous[i];}
        indices.push(joint);indices.push(...goalChain.reverse());
      }
      // The reverse leg is checked in the actual travel direction; a one-way
      // terrain edge cannot be made valid by reversing a stored predecessor.
      const actorRoot=viaSeed?indices.findIndex((index,j)=>j>0&&field.previous[indices[j-1]]<0):-1;
      for(let j=1;j<indices.length;j++){
        const a={x:field.minX+indices[j-1]%field.width,z:field.minZ+Math.floor(indices[j-1]/field.width)};
        const b={x:field.minX+indices[j]%field.width,z:field.minZ+Math.floor(indices[j]/field.width)};
        if(j===actorRoot){
          const seed={x:field.startX,z:field.startZ};
          if(!nav.segmentClear(a,seed,radius,null,false)||!nav.segmentClear(seed,b,radius,null,false))return fallback('disconnected-seed-root',start,end,radius,margin);
        }else{
          const via=field.previous[indices[j]]===indices[j-1]?field.edgeVia.get(indices[j]):field.previous[indices[j-1]]===indices[j]?field.edgeVia.get(indices[j-1])?.toReversed():null;
          if(via){
            if(!nav.segmentClear(a,via[0],radius,null,false)||!nav.segmentClear(via[0],via[1],radius,null,false)||!nav.segmentClear(via[1],b,radius,null,false))return fallback('invalid-portal-edge',start,end,radius,margin);
          }else if(!(grid?grid.step(a.x,a.z,b.x,b.z,radius):nav.segmentClear(a,b,radius,null,false)))return fallback('directional-shared-edge',start,end,radius,margin);
        }
      }
      metrics.sharedOrigins++;metrics.sharedRouteSteps+=indices.length;
    }else{
      let i=best;while(i>=0){indices.push(i);i=field.previous[i];}indices.reverse();
    }
    const route=[];
    for(let j=0;j<indices.length;j++){
      if(viaSeed&&j>0&&field.previous[indices[j-1]]<0)route.push({x:field.startX,z:field.startZ});
      else if(j>0){
        const via=field.previous[indices[j]]===indices[j-1]?field.edgeVia.get(indices[j]):field.previous[indices[j-1]]===indices[j]?field.edgeVia.get(indices[j-1])?.toReversed():null;
        if(via){route.push(...via);metrics.portalTraversals++;}
      }
      const i=indices[j];route.push({x:field.minX+i%field.width,z:field.minZ+Math.floor(i/field.width)});
    }
    route.push({x:end.x,z:end.z});metrics.treeRoutes++;
    if(shareOrigins&&nav.smoothPath){const smooth=nav.smoothPath(start,route,radius,null,false);metrics.sharedSmoothedSteps+=smooth.length;return smooth;}
    return route;
  };
  return metrics;
}

// QA-only multi-source reverse field for one crop component and animal size.
// Sources are actual attack service points, not individual animal origins.
// The field keeps a few different target owners per cell so reservations do
// not immediately force the next animal back into per-crop A*.
import {SearchFrontier} from '../../src/world/search-frontier.js';
import {logicalAnimalGrid} from './logical-animal-grid-prototype.mjs';
import {breachPortalTable} from './breach-portal-prototype.mjs';

const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
const reverse=[1,0,3,2,7,6,5,4];
const O=4;
const stateKey=(i,owner)=>`${i}:${owner}`;
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function installSharedGoalField(nav,metrics={},global=false){
  Object.assign(metrics,{built:0,reused:0,visited:0,sources:0,completeFields:0,boundaryFields:0,buildMilliseconds:0,fieldRoutes:0,misses:0,missReasons:{},fallbacks:0,portalCount:0,portalBuildMilliseconds:0,grid:{}});
  let version=null,fields=new Map(),grid=null;
  const reset=()=>{
    if(version===nav.version)return;
    version=nav.version;fields=new Map();metrics.grid={};grid=logicalAnimalGrid(nav,metrics.grid);
    const portals=breachPortalTable(nav);metrics.portalCount=portals.portals.length;metrics.portalBuildMilliseconds+=portals.buildMilliseconds;
  };
  function build(targets,radius,ranks=null){
    const started=performance.now(),animals=nav.state.raid?.animals??[];
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(const t of [...targets,...animals,...animals.map(a=>a.spawn)]){
      if(!t)continue;minX=Math.min(minX,t.x);maxX=Math.max(maxX,t.x);minZ=Math.min(minZ,t.z);maxZ=Math.max(maxZ,t.z);
    }
    minX=Math.floor(minX)-8;maxX=Math.ceil(maxX)+8;minZ=Math.floor(minZ)-8;maxZ=Math.ceil(maxZ)+8;
    const width=maxX-minX+1,height=maxZ-minZ+1;
    if(width*height>100000)return null;
    const idx=(x,z)=>(z-minZ)*width+x-minX,inside=(x,z)=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ;
    const labels=new Map(),costs=new Map(),next=new Map(),source=new Map(),sources=[],frontier=new SearchFrontier();
    const offer=(x,z,owner,g,nextKey=null,sourceId=null)=>{
      if(!inside(x,z))return;
      const i=idx(x,z),k=stateKey(i,owner),prior=costs.get(k);
      if(prior!==undefined&&prior<=g)return;
      let owners=labels.get(i);
      if(!owners){owners=new Map();labels.set(i,owners);}
      if(!owners.has(owner)&&owners.size>=O){
        let worstOwner=null,worstRank=-1,worst=-1;
        for(const [candidate,value] of owners){
          const rank=ranks?.[candidate]??0;
          if(rank>worstRank||rank===worstRank&&value>worst){worstOwner=candidate;worstRank=rank;worst=value;}
        }
        const rank=ranks?.[owner]??0;
        if(rank>worstRank||rank===worstRank&&g>=worst)return;
        owners.delete(worstOwner);
      }
      owners.set(owner,g);costs.set(k,g);
      if(nextKey!==null)next.set(k,nextKey);
      if(sourceId!==null)source.set(k,sourceId);
      frontier.push({x,z,i,owner,g,f:g});
    };
    for(let owner=0;owner<targets.length;owner++){
      const target=targets[owner],reach=.6+radius;
      for(let j=0;j<16;j++){
        const angle=j*Math.PI/8,point={x:target.x+Math.sin(angle)*reach,z:target.z+Math.cos(angle)*reach};
        const cx=Math.round(point.x),cz=Math.round(point.z);
        if(!inside(cx,cz)||!grid.walkable(cx,cz,radius)||!nav.segmentClear({x:cx,z:cz},point,radius,null,false))continue;
        const sourceId=sources.length;sources.push({target,point});
        offer(cx,cz,owner,near({x:cx,z:cz},point),null,sourceId);
      }
    }
    let visited=0,touched=false;
    while(frontier.length){
      const cur=frontier.pop(),k=stateKey(cur.i,cur.owner);
      if(cur.g!==costs.get(k)||!labels.get(cur.i)?.has(cur.owner))continue;
      if(++visited>30000)break;
      if(cur.x===minX||cur.x===maxX||cur.z===minZ||cur.z===maxZ)touched=true;
      for(let d=0;d<8;d++){
        const [dx,dz]=directions[d],x=cur.x+dx,z=cur.z+dz;
        if(!inside(x,z)||!grid.walkable(x,z,radius))continue;
        // The path followed by an animal points from the new cell back to
        // cur. Check that direction rather than assuming an invertible edge.
        if(!grid.step(x,z,cur.x,cur.z,radius,reverse[d]))continue;
        offer(x,z,cur.owner,cur.g+Math.hypot(dx,dz),k,source.get(k));
      }
    }
    metrics.built++;metrics.visited+=visited;metrics.sources+=sources.length;metrics.buildMilliseconds+=performance.now()-started;
    if(!frontier.length&&!touched)metrics.completeFields++;else metrics.boundaryFields++;
    return {version:nav.version,radius,targets,ranks,minX,maxX,minZ,maxZ,width,labels,costs,next,source,sources,complete:!frontier.length&&!touched};
  }
  function query(actor,eligible,groupId,accept=()=>true,ranks=null){
    if(!eligible.length)return undefined;
    if(eligible.some(p=>nav.state.spells?.some(sp=>sp.kind==='shield'&&sp.remaining>0&&near(sp,p)<=sp.radius)))return undefined;
    reset();const cacheKey=`${groupId}:${actor.radius}`;
    let field=fields.get(cacheKey);
    if(field)metrics.reused++;
    else{
      field=build(eligible,actor.radius,ranks);
      if(!field){metrics.fallbacks++;return undefined;}
      if(fields.size>=12)fields.delete(fields.keys().next().value);
      fields.set(cacheKey,field);
    }
    const valid=new Set(eligible.map(p=>p.id)),sx=Math.round(actor.x),sz=Math.round(actor.z),choices=[];
    let connectors=0,labels=0,reserved=0,rejected=0,broken=0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=sx+dx,z=sz+dz;
      if(x<field.minX||x>field.maxX||z<field.minZ||z>field.maxZ||!nav.segmentClear(actor,{x,z},actor.radius,null,false))continue;
      connectors++;const i=(z-field.minZ)*field.width+x-field.minX;
      for(const [owner,g] of field.labels.get(i)??[]){
        labels++;
        const target=field.targets[owner];if(valid.has(target.id))choices.push({i,owner,g:g+near(actor,{x,z})});
      }
    }
    choices.sort((a,b)=>(field.ranks?.[a.owner]??0)-(field.ranks?.[b.owner]??0)||a.g-b.g||a.owner-b.owner);
    for(const choice of choices){
      const path=[],seen=new Set();let k=stateKey(choice.i,choice.owner),validPath=true;
      while(k&&!seen.has(k)){
        seen.add(k);const [i]=k.split(':').map(Number);
        path.push({x:field.minX+i%field.width,z:field.minZ+Math.floor(i/field.width)});
        k=field.next.get(k);
      }
      if(k||!path.length)validPath=false;
      const sourceId=field.source.get(stateKey(choice.i,choice.owner));
      const seed=field.sources[sourceId];
      if(!validPath||!seed||seed.target.id!==field.targets[choice.owner].id){broken++;continue;}
      if(nav.state.raid?.reservations?.[`crop:${seed.target.id}`]){reserved++;continue;}
      if(!accept(seed.target,seed.point)){rejected++;continue;}
      if(!nav.segmentClear(path.at(-1),seed.point,actor.radius,null,false)){broken++;continue;}
      path.push(seed.point);
      metrics.fieldRoutes++;
      return {target:seed.target,approach:{point:{...seed.point,id:`approach-${seed.target.id}-shared`},path}};
    }
    metrics.misses++;
    const reason=!connectors?'no-actor-connector':!labels?`no-field-label-${field.complete?'complete':'unknown'}`:!choices.length?'no-current-target':reserved?'reserved':rejected?'occupied-approach':broken?'broken-field':'other';
    metrics.missReasons[reason]=(metrics.missReasons[reason]??0)+1;
    // The field may be bounded or omit narrow fractional connections. A miss
    // is never a negative proof; native search remains the safe fallback.
    return undefined;
  }
  if(global)nav.sharedCropSelection=(actor,groups,accept)=>{
    const targets=[],ranks=[];
    for(let rank=0;rank<groups.length;rank++)for(const target of groups[rank].targets){targets.push(target);ranks.push(rank);}
    return query(actor,targets,`all-crops:${targets.map(t=>t.id).join(',')}`,accept,ranks);
  };
  else nav.sharedCropApproach=query;
  return metrics;
}

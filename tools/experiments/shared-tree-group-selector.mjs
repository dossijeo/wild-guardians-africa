// QA-only crop selection over the route tree's visited cells. The route tree
// is the sole connectivity exploration: this selector never flood-fills.
export function installSharedTreeGroupSelector(nav,metrics={}){
  Object.assign(metrics,{queries:0,groups:0,targets:0,points:0,probes:0,routes:0,certifiedSkips:0,uncertain:0,uncertainReasons:{},stalePoints:0});
  const uncertain=reason=>{metrics.uncertain++;metrics.uncertainReasons[reason]=(metrics.uncertainReasons[reason]??0)+1;return undefined;};
  let version=-1,services=new Map();
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const servicePoints=(target,radius)=>{
    if(version!==nav.version){version=nav.version;services=new Map();}
    const key=`${target.id}:${radius}`;
    if(services.has(key))return services.get(key);
    const reach=.6+radius,cx=Math.round(target.x),cz=Math.round(target.z),extent=Math.ceil(reach)+1,seen=new Set(),points=[];
    for(let dz=-extent;dz<=extent;dz++)for(let dx=-extent;dx<=extent;dx++){
      const x=cx+dx,z=cz+dz,len=Math.hypot(x-target.x,z-target.z);
      if(len<.01||len>reach+1.5||!nav.walkable(x,z,radius,null,false))continue;
      const sector=Math.round(Math.atan2(x-target.x,z-target.z)*4/Math.PI);
      if(seen.has(sector))continue;
      seen.add(sector);
      const point={id:`approach-${target.id}-tree-${sector}`,x:target.x+(x-target.x)/len*reach,z:target.z+(z-target.z)/len*reach};
      metrics.points++;
      if(nav.walkable(point.x,point.z,radius,null,false)&&nav.segmentClear({x,z},point,radius,null,false))points.push(point);
    }
    services.set(key,points);return points;
  };
  const actorField=actor=>nav.__sharedRouteFields?.find(f=>{
    if(f.version!==nav.version||f.radius!==actor.radius)return false;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=Math.round(actor.x)+dx,z=Math.round(actor.z)+dz;
      if(x<f.minX||x>f.maxX||z<f.minZ||z>f.maxZ)continue;
      if(Number.isFinite(f.cost[(z-f.minZ)*f.width+x-f.minX])&&nav.segmentClear(actor,{x,z},actor.radius,null,false))return true;
    }
    return false;
  });
  const inField=(field,point,radius)=>{
    if(!field)return false;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const x=Math.round(point.x)+dx,z=Math.round(point.z)+dz;
      if(x<field.minX||x>field.maxX||z<field.minZ||z>field.maxZ)continue;
      if(Math.hypot(x-point.x,z-point.z)>=1.5)continue;
      if(Number.isFinite(field.cost[(z-field.minZ)*field.width+x-field.minX])&&nav.segmentClear({x,z},point,radius,null,false))return true;
    }
    return false;
  };
  nav.sharedCropSelection=(actor,groups,accept)=>{
    metrics.queries++;
    let field=actorField(actor);
    for(const group of groups){
      metrics.groups++;
      const ordered=[...group.targets].sort((a,b)=>distance(actor,a)-distance(actor,b)||a.id.localeCompare(b.id));
      // One or two nearby goals seed the shared tree. Subsequent animals
      // consult that same tree, even when their exact origins differ.
      if(!field)for(const target of ordered.slice(0,2)){
        if(field)break;
        for(const point of servicePoints(target,actor.radius).sort((a,b)=>distance(actor,a)-distance(actor,b)).slice(0,2)){
          if(!accept(target,point)||!nav.walkable(point.x,point.z,actor.radius,null,false))continue;
          metrics.probes++;
          const path=nav.approachPath(actor,point,actor.radius,32);
          if(path){metrics.routes++;return {target,approach:{point,path}};}
          field=actorField(actor);
          if(field)break;
        }
      }
      if(!field)return uncertain('no-field');
      let eligible=false;
      for(const target of ordered){
        metrics.targets++;
        // Shields and reservations can change without a topology update.
        if(nav.state.spells?.some(sp=>sp.kind==='shield'&&sp.remaining>0&&distance(sp,target)<=sp.radius)){
          return uncertain('shield');
        }
        for(const point of servicePoints(target,actor.radius)){
          if(!accept(target,point))continue;
          eligible=true;
          if(!nav.walkable(point.x,point.z,actor.radius,null,false)){metrics.stalePoints++;continue;}
          if(!inField(field,point,actor.radius))continue;
          const path=nav.approachPath(actor,point,actor.radius,32);
          if(path){metrics.routes++;return {target,approach:{point,path}};}
        }
      }
      if(!eligible)return uncertain('no-eligible');
      if(!field.complete)return uncertain('incomplete-field');
      if(field.touchedBoundary)return uncertain('boundary');
      metrics.certifiedSkips++;
    }
    return null;
  };
  return metrics;
}

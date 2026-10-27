const attempts=new WeakMap();
const reaches=[.5,1,2,4,8,16],angles=16,budget=8,maxSlices=2048;
// A physical local connector can reach the normal grid without seeing the
// distant exit directly. Use the existing incremental native route search;
// never drain its iterator synchronously or relax hostile-body collision.
export function animalGridExitBridge(actor,end,nav){
 if(actor.status!=='retreating'||!nav.findPathSteps)return {pending:false,path:null};
 const radius=actor.radius??.28;
 const key=JSON.stringify([nav.version??0,actor.x,actor.z,end.x,end.z,radius]);
 let a=attempts.get(actor);
 if(!a||a.key!==key||a.nav!==nav||a.field!==nav.field||a.obstacles!==nav.obstacles||a.walkable!==nav.walkable||a.segmentClear!==nav.segmentClear||a.findPathSteps!==nav.findPathSteps){
  a={key,nav,field:nav.field,obstacles:nav.obstacles,walkable:nav.walkable,segmentClear:nav.segmentClear,findPathSteps:nav.findPathSteps,next:0};attempts.set(actor,a);
 }
 if(a.failed)return {pending:false,path:null};
 if(a.route){
  for(let count=0;count<budget&&a.verify<a.route.length;count++,a.verify++){
   const p=a.route[a.verify];
   if(!nav.walkable(p.x,p.z,radius,null,false)||!nav.segmentClear(a.last,p,radius,null,false)){a.route=null;break;}
   a.last=p;
  }
  if(a.route&&a.verify===a.route.length){const path=a.route;attempts.delete(actor);return {pending:false,path};}
  return {pending:true,path:null};
 }
 if(a.iterator){
  const step=a.iterator.next();a.slices++;
  if(!step.done&&a.slices<maxSlices)return {pending:true,path:null};
  a.iterator=null;
  if(step.done&&step.value){a.route=[a.point,...step.value];a.verify=0;a.last={x:actor.x,z:actor.z};}
  return {pending:true,path:null};
 }
 const heading=Math.atan2(end.x-actor.x,end.z-actor.z);
 for(let count=0;count<budget&&a.next<reaches.length*angles;count++){
  const index=a.next++,sample=index%angles;
  const offset=sample===0?0:Math.ceil(sample/2)*(sample%2?1:-1)*Math.PI/8;
  const reach=reaches[Math.floor(index/angles)];
  const point={x:actor.x+Math.sin(heading+offset)*reach,z:actor.z+Math.cos(heading+offset)*reach};
  if(!nav.walkable(point.x,point.z,radius,null,false)||!nav.segmentClear(actor,point,radius,null,false))continue;
  a.point=point;a.slices=0;
  // The direct fast-path itself samples a potentially very long fractional
  // ray synchronously. A rare bridge already needs grid routing; omit that
  // optional shortcut, retaining every native edge and endpoint test.
  a.iterator=nav.findPathSteps(point,{x:end.x,z:end.z},radius,null,false,64,{skipDirect:true});
  return {pending:true,path:null};
 }
 if(a.next===reaches.length*angles){a.failed=true;return {pending:false,path:null};}
 return {pending:true,path:null};
}

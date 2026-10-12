// A positive native route is required before accepting a new canyon settlement.
// This checks natural access before player walls exist; it never opens a wall,
// fills the river or grants hostile units a water-crossing exception.
export function* canyonLandAccessSteps(nav,points,{radius=1.1,distance=32,fastOnly=false}={}) {
 if(!nav.field.canyon)return null;
 const candidates=[];
 for(const target of points){
  yield;
  if(!nav.walkable(target.x,target.z,radius,null,false))continue;
  // Follow the bank's procedural bend with verified segments before trying A*.
  // The endpoint stays on the same bank rather than across a meandering river.
  if(typeof nav.field.riverX==='function')for(const direction of [-1,1]){
   const offset=target.x-nav.field.riverX(target.z),path=[];let previous=target,clear=true;
   for(let j=1;j<=8;j++){
    const z=target.z+direction*distance*j/8,point={x:nav.field.riverX(z)+offset,z};
    if(!nav.segmentClear(previous,point,radius,null,false)){clear=false;break;}
    path.push(point);previous=point;
   }
   if(clear)return {entry:previous,target:{...target},radius,path:[...path.slice(0,-1).reverse(),{...target}]};
  }
  for(let i=0;i<16;i++){
   const angle=i*Math.PI/8,entry={x:target.x+Math.cos(angle)*distance,z:target.z+Math.sin(angle)*distance};
   if(!nav.walkable(entry.x,entry.z,radius,null,false))continue;
   if(nav.segmentClear(entry,target,radius,null,false))return {entry,target:{...target},radius,path:[{...target}]};
   if(candidates.length<16)candidates.push({entry,target});
  }
 }
 if(fastOnly)return null;
 for(const {entry,target} of candidates){
  yield;
  const path=nav.path(entry,target,radius,null,false,32);
  if(path)return {entry,target:{...target},radius,path};
 }
 return null;
}

export function canyonLandAccess(nav,points,options){
 const search=canyonLandAccessSteps(nav,points,options);let result;
 do {result=search.next();}while(!result.done);
 return result.value;
}

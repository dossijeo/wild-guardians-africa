import {actorFluidClear} from './actor-fluid-clearance.js';

const MAX_SLOPE=.51,MAX_EXIT=.5,SAMPLE=.025;
const verified=new WeakMap(),attempts=new WeakMap();
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function footprintSlope(nav,point,radius){
 let peak=0;
 for(let sample=0;sample<5;sample++){
  const x=point.x+(sample===1?radius:sample===2?-radius:0);
  const z=point.z+(sample===3?radius:sample===4?-radius:0);
  const value=nav.field.canyon?
   Math.hypot(nav.workerSurface(x+.8,z)-nav.workerSurface(x-.8,z),nav.workerSurface(x,z+.8)-nav.workerSurface(x,z-.8))/1.6:
   nav.field.slope(x,z);
  if(!Number.isFinite(value))return NaN;
  peak=Math.max(peak,value);
 }
 return peak;
}
function proof(nav,start,point,radius){
 if(!nav.field||!nav.testSegmentClear||!nav.walkable||
   (nav.field.canyon?typeof nav.workerSurface!=='function':typeof nav.field.slope!=='function'))return null;
 const length=distance(start,point);if(!length||length>MAX_EXIT+1e-10)return null;
 const initial=footprintSlope(nav,start,radius);
 if(!(initial>.5&&initial<=MAX_SLOPE)||
   !actorFluidClear(nav,start,radius)||!nav.walkable(point.x,point.z,radius,null,false))return null;
 // Only slope is checked separately; native swept props, structures, walls,
 // shields and the biome's original fluid exception remain in force.
 const collision=Object.assign(Object.create(nav),{
  terrainValid:(x,z)=>actorFluidClear(nav,{x,z},radius),segmentCache:new Map()
 });
 if(!collision.testSegmentClear(start,point,radius,null,false))return null;
 let prior=initial;const count=Math.ceil(length/SAMPLE);
 for(let i=1;i<=count;i++){
  const position={x:start.x+(point.x-start.x)*i/count,z:start.z+(point.z-start.z)*i/count};
  const slope=footprintSlope(nav,position,radius);
  if(!Number.isFinite(slope)||!actorFluidClear(nav,position,radius)||
    Math.max(0,slope-.5)>Math.max(0,prior-.5)+1e-10)return null;
  prior=slope;
 }
 return {nav,version:nav.version,radius,start:{x:start.x,z:start.z},last:{x:start.x,z:start.z},lastSlope:initial,point:{...point},length};
}

// Repair an already marginal legacy retreat, never ordinary animal routing.
// The finite attempt is memoized even when it fails; stationary invalid saves
// must not repeat 160 candidate/tail searches every rendered frame.
export function animalSlopeRecoveryPath(nav,actor,end,radius){
 if(actor.status!=='retreating'||!nav.field||
   (nav.field.canyon?typeof nav.workerSurface!=='function':typeof nav.field.slope!=='function'))return null;
 const key=JSON.stringify([nav.version,actor.x,actor.z,end.x,end.z,radius]);
 const prior=attempts.get(actor);if(prior?.nav===nav&&prior.key===key)return null;
 attempts.set(actor,{nav,key});
 const initial=footprintSlope(nav,actor,radius);
 if(!(initial>.5&&initial<=MAX_SLOPE)||!actorFluidClear(nav,actor,radius))return null;
 for(let step=1;step<=5;step++)for(let angle=0;angle<32;angle++){
  const length=step*.1,a=angle*Math.PI/16;
  const point={x:actor.x+Math.sin(a)*length,z:actor.z+Math.cos(a)*length};
  const validated=proof(nav,actor,point,radius);if(!validated)continue;
  const tail=nav.path(point,end,radius,null,false);if(!tail)continue;
  const path=[point,...tail];verified.set(actor,{...validated,path});return path;
 }
 return null;
}

// An explicit exception for this one proven prefix. It ends at the first
// legal waypoint. Dynamic bodies still run before this clearance, and the
// strict ordinary endpoint/prefix checks take over on the next route leg.
export function animalSlopeRecoveryClear(actor,nav,start,end,radius){
 const point=actor.path?.[0];
 if(actor.status!=='retreating'||!point)return false;
 let cached=verified.get(actor);
 if(cached?.disabled&&cached.nav===nav&&cached.version===nav.version&&cached.radius===radius&&cached.path===actor.path)return false;
 if(!(cached?.nav===nav&&cached.version===nav.version&&cached.radius===radius&&
   !cached.disabled&&cached.path===actor.path&&cached.point.x===point.x&&cached.point.z===point.z&&
   distance(cached.last,start)<1e-8)){
  cached=proof(nav,start,point,radius);
  if(!cached){verified.set(actor,{nav,version:nav.version,radius,path:actor.path,disabled:true});return false;}
  cached.path=actor.path;verified.set(actor,cached);
 }
 // Substeps can neither leave the validated segment nor travel backward.
 if(distance(cached.start,start)+distance(start,end)+distance(end,cached.point)>cached.length+1e-8)return false;
 const slope=footprintSlope(nav,end,radius);
 if(!Number.isFinite(slope)||Math.max(0,slope-.5)>Math.max(0,cached.lastSlope-.5)+1e-10)return false;
 cached.last={x:end.x,z:end.z};cached.lastSlope=slope;return true;
}

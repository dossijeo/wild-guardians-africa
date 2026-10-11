// Bounded, exact-coordinate cache for one isolated immutable-geometry proof.
import {Navigation} from '../src/world/navigation.js';
export function installProofWalkCache(nav,{capacity=65536}={}){
 if(nav.testWalkable!==Navigation.prototype.testWalkable||!Number.isSafeInteger(capacity)||capacity<1||capacity>131072)throw Error('Unsupported proof walk-cache configuration');
 const original=nav.testWalkable,hadOwn=Object.hasOwn(nav,'testWalkable'),contexts=new WeakMap(),entries=new Map();
 let nextContext=0,requests=0,hits=0,misses=0,evictions=0,invalidations=0;
 function testWalkable(x,z,radius=.3,ignore=null,worker=false){
  requests++;
  if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||ignore!==null&&typeof ignore!=='string')return original.call(this,x,z,radius,ignore,worker);
  let context=contexts.get(this);
  if(!context||context.version!==this.version||context.field!==this.field||context.obstacles!==this.obstacles||context.suppressed!==this.suppressed){
   if(context){entries.clear();invalidations++;}
   context={id:nextContext++,version:this.version,field:this.field,obstacles:this.obstacles,suppressed:this.suppressed};contexts.set(this,context);
  }
  const key=`${context.id}|${x},${z}:${radius}:${ignore}:${worker}`,hit=entries.get(key),prior=this.workerSweep;
  if(hit){hits++;if(prior)prior.peak=Math.max(prior.peak,hit.peak);return hit.valid;}
  misses++;const sweep={peak:0};this.workerSweep=sweep;let valid;
  try{valid=original.call(this,x,z,radius,ignore,worker);}finally{this.workerSweep=prior;if(prior)prior.peak=Math.max(prior.peak,sweep.peak);}
  if(entries.size>=capacity){entries.delete(entries.keys().next().value);evictions++;}
  entries.set(key,{valid,peak:sweep.peak});return valid;
 }
 nav.testWalkable=testWalkable;
 return {stats:()=>({capacity,entries:entries.size,contexts:nextContext,requests,hits,misses,evictions,invalidations}),restore(){
  if(nav.testWalkable!==testWalkable)throw Error('Proof walk-cache ownership changed');
  if(hadOwn)nav.testWalkable=original;else delete nav.testWalkable;entries.clear();
 }};
}

// Exact, bounded QA-only terrain queries. Solid/prop collisions still execute
// in native testWalkable. No coordinate quantisation or gameplay modification.
import {Navigation} from '../src/world/navigation.js';
const adapters=new WeakMap();
export function installTerrainValidityMemo(nav,{capacity=65536}={}){
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>131072)throw Error('Invalid terrain memo capacity');
 if(nav.terrainValid!==Navigation.prototype.terrainValid)throw Error('Custom terrain validity adapters are unsupported');
 const original=nav.terrainValid,hadOwn=Object.hasOwn(nav,'terrainValid');
 let adapter=adapters.get(nav);
 if(!adapter||adapter.capacity!==capacity){
  const fields=new WeakMap();let requests=0,hits=0,misses=0,evictions=0,fallbacks=0,maxEntries=0;
  function terrainValid(x,z,radius=.3,worker=false,allowFluid=false){
   requests++;
   if(![x,z,radius].every(Number.isFinite)||this.workerSurface!==Navigation.prototype.workerSurface){fallbacks++;return original.call(this,x,z,radius,worker,allowFluid);}
   const field=this.field;
   // Configuration is checked once per installation below. Method identities
   // are checked per query; field configuration is frozen during this proof.
   const methods=[field,field.heightCache,field.height,field.surface,field.slope,field.waterInfo,field.fluidInside,field.blocked,field.raw,field.naturalHeight,field.riverBase,field.riverX,field.nearbyPonds,this.workerSurface];
   // Terrain has no obstacles or actor positions. All proof/worker views using
   // the same field share this one bounded cache, rather than one per worker.
   let cache=fields.get(field);
   if(!cache||cache.epoch!==this.version||cache.installation!==adapter.installation||methods.some((value,i)=>value!==cache.methods[i])){
    cache={epoch:this.version,installation:adapter.installation,methods,entries:new Map()};fields.set(field,cache);
   }
   const key=`${x},${z}:${radius}:${worker}:${allowFluid}`,hit=cache.entries.get(key),prior=this.workerSweep;
   if(hit){hits++;maxEntries=Math.max(maxEntries,cache.entries.size);if(prior)prior.peak=Math.max(prior.peak,hit.peak);return hit.valid;}
   misses++;const sweep={peak:0};this.workerSweep=sweep;let valid;
   try{valid=original.call(this,x,z,radius,worker,allowFluid);}finally{this.workerSweep=prior;if(prior)prior.peak=Math.max(prior.peak,sweep.peak);}
   if(cache.entries.size>=capacity){cache.entries.delete(cache.entries.keys().next().value);evictions++;}
   cache.entries.set(key,{valid,peak:sweep.peak});maxEntries=Math.max(maxEntries,cache.entries.size);return valid;
  }
  adapter={capacity,installation:0,terrainValid,reset(){requests=hits=misses=evictions=fallbacks=maxEntries=0;},stats:()=>({capacity,requests,hits,misses,evictions,fallbacks,maxEntries})};adapters.set(nav,adapter);
 }
 const signature=JSON.stringify([nav.version,nav.field.c,nav.field.seed,nav.field.phase,nav.field.riverLevel,nav.field.canyon,nav.field.riverActive,nav.field.pondsActive,nav.field.wetland,nav.field.desert,nav.field.featureCell,nav.field.settlementSite]);
 if(adapter.signature!==signature){adapter.installation++;adapter.signature=signature;}
 adapter.reset();nav.terrainValid=adapter.terrainValid;
 return {stats:adapter.stats,restore(){if(nav.terrainValid!==adapter.terrainValid)throw Error('Terrain memo ownership changed');if(hadOwn)nav.terrainValid=original;else delete nav.terrainValid;}};
}

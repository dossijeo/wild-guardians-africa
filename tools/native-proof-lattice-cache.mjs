import {TerrainField} from '../src/world/terrain.js';
const prototype=TerrainField.prototype,methods=Object.freeze(Object.getOwnPropertyNames(prototype).filter(k=>k!=='constructor'&&typeof prototype[k]==='function').map(k=>[k,prototype[k]]));
const lattice=prototype.lattice,surface=prototype.surface;
const canonical=f=>Object.getPrototypeOf(f??{})===prototype&&methods.every(([k,v])=>f[k]===v);
const identity=f=>JSON.stringify([f.c,f.seed,f.phase,f.settlementSite,f.canyon,f.desert,f.wetland,f.riverLevel,f.riverActive,f.pondsActive,f.desertWind,f.featureCell]);
// A synchronous read-only QA proof owns this lease. No renderer/navigation
// field is patched. Changed deep inputs/methods reject the whole result, not
// merely clear a cache after returning a possibly stale certificate.
export function withNativeProofLatticeCache(view,compute,{mode='off',limit=65536,onDiagnostics=()=>{}}={}){
 if(!['off','diagnose','cache'].includes(mode)||!Number.isSafeInteger(limit)||limit<1||limit>65536)throw Error('Invalid QA lattice cache options');
 const stats={mode,surfaceCalls:0,latticeCalls:0,nativeLatticeCalls:0,hits:0,capacityBypasses:0,coarseCollisionCalls:0,entries:0,epochInvalidations:0,canonical:false};
 if(mode==='off'){const result=compute(view);onDiagnostics(stats);return result;}
 const field=view.field;stats.canonical=canonical(field);if(!stats.canonical){const result=compute(view);onDiagnostics(stats);return result;}
 const initialIdentity=identity(field),shadow=Object.create(view),shadowField=Object.create(field),columns=new Map();let active=true,version=view.version;
 Object.defineProperty(shadow,'field',{get:()=>active?shadowField:view.field});
 shadowField.surface=function(x,z){if(!active)return field.surface(x,z);stats.surfaceCalls++;return surface.call(this,x,z);};
 shadowField.lattice=function(x,z){
  if(!active)return field.lattice(x,z);stats.latticeCalls++;
  if(version!==view.version){columns.clear();stats.entries=0;stats.epochInvalidations++;version=view.version;}
  if(mode!=='cache'||!Number.isFinite(x)||!Number.isFinite(z)||Object.is(x,-0)||Object.is(z,-0)){stats.nativeLatticeCalls++;return lattice.call(this,x,z);}
  const column=columns.get(x);if(column?.has(z)){stats.hits++;return column.get(z);}
  stats.nativeLatticeCalls++;const value=lattice.call(this,x,z);
  if(stats.entries>=limit){stats.capacityBypasses++;return value;}
  const target=column??new Map();if(!column)columns.set(x,target);target.set(z,value);stats.entries++;return value;
 };
 const coarse=view.coarseSegmentClear;if(typeof coarse==='function')shadow.coarseSegmentClear=function(...args){stats.coarseCollisionCalls++;return coarse.apply(this,args);};
 try{
  const result=compute(shadow);if(result?.then)throw Error('QA lattice lease must remain synchronous');
  if(view.field!==field||view.coarseSegmentClear!==coarse||identity(field)!==initialIdentity||!canonical(field))throw Error('QA lattice lease physical inputs changed; reject certificate');
  return result;
 }finally{active=false;onDiagnostics({...stats});columns.clear();}
}

import {Navigation} from '../src/world/navigation.js';
import {TerrainField} from '../src/world/terrain.js';
// One synchronous read-only proof owns this cache. No shared main navigator
// methods are patched; escaped views revert to native calls after the lease.
export function withNativeProofTerrainQueryCache(view,compute,{enabled=false,limit=65536,onDiagnostics=()=>{}}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>65536)throw Error('Invalid proof terrain cache bound');
 const stats={enabled,queries:0,hits:0,misses:0,bypassed:0,invalidations:0,entries:0,peakEntries:0};
 if(!enabled){const result=compute(view);onDiagnostics(stats);return result;}
 const cached=Object.create(view),entries=new Map();let active=true,context=null;
 const contextOf=()=>{const f=view.field;return {version:view.version,field:f,terrain:view.terrainValid,worker:view.workerSurface,config:f?.c,relief:f?.c?.relief,seed:f?.seed,phase:f?.phase,settlement:f?.settlementSite,canyon:f?.canyon,desert:f?.desert,wetland:f?.wetland,riverLevel:f?.riverLevel,riverActive:f?.riverActive,pondsActive:f?.pondsActive,desertWind:f?.desertWind,featureCell:f?.featureCell,
  slope:f?.slope,surface:f?.surface,fluid:f?.fluidInside,water:f?.waterInfo,height:f?.height,lattice:f?.lattice,raw:f?.raw,natural:f?.naturalHeight,river:f?.riverX,riverBase:f?.riverBase,ponds:f?.nearbyPonds,pondMetric:f?.pondMetric,
  canonical:Object.getPrototypeOf(f??{})===TerrainField.prototype&&view.terrainValid===Navigation.prototype.terrainValid&&view.workerSurface===Navigation.prototype.workerSurface&&Object.getOwnPropertyNames(TerrainField.prototype).every(k=>k==='constructor'||typeof TerrainField.prototype[k]!=='function'||f[k]===TerrainField.prototype[k])};};
 cached.terrainValid=function(x,z,radius=.3,worker=false,allowFluid=false){
  stats.queries++;const f=view.field;
  if(!context||context.version!==view.version||context.field!==f||context.terrain!==view.terrainValid||context.worker!==view.workerSurface||context.config!==f?.c||context.relief!==f?.c?.relief||context.seed!==f?.seed||context.phase!==f?.phase||context.settlement!==f?.settlementSite||context.canyon!==f?.canyon||context.desert!==f?.desert||context.wetland!==f?.wetland||context.riverLevel!==f?.riverLevel||context.riverActive!==f?.riverActive||context.pondsActive!==f?.pondsActive||context.desertWind!==f?.desertWind||context.featureCell!==f?.featureCell||context.slope!==f?.slope||context.surface!==f?.surface||context.fluid!==f?.fluidInside||context.water!==f?.waterInfo||context.height!==f?.height||context.lattice!==f?.lattice||context.raw!==f?.raw||context.natural!==f?.naturalHeight||context.river!==f?.riverX||context.riverBase!==f?.riverBase||context.ponds!==f?.nearbyPonds||context.pondMetric!==f?.pondMetric){if(context)stats.invalidations++;entries.clear();context=contextOf();}
  if(!active||!context.canonical||!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(radius)||typeof worker!=='boolean'||typeof allowFluid!=='boolean'){stats.bypassed++;return view.terrainValid.call(this,x,z,radius,worker,allowFluid);}
  const key=`${x},${z}:${radius}:${worker}:${allowFluid}`,previous=this.workerSweep,hit=entries.get(key);
  if(hit){stats.hits++;if(previous)previous.peak=Math.max(previous.peak,hit.peak);return hit.valid;}
  stats.misses++;const sweep={peak:0};this.workerSweep=sweep;let valid;
  try{valid=view.terrainValid.call(this,x,z,radius,worker,allowFluid);}finally{this.workerSweep=previous;if(previous)previous.peak=Math.max(previous.peak,sweep.peak);}
  if(entries.size>=limit)entries.delete(entries.keys().next().value);entries.set(key,{valid,peak:sweep.peak});stats.peakEntries=Math.max(stats.peakEntries,entries.size);return valid;
 };
 try{const result=compute(cached);if(result?.then)throw Error('Proof terrain cache lease must remain synchronous');return result;}finally{active=false;stats.entries=entries.size;onDiagnostics({...stats});entries.clear();}
}

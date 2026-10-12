import {Navigation} from '../src/world/navigation.js';import {TerrainField} from '../src/world/terrain.js';import {evictOldest} from '../src/world/fifo-eviction.js';
const navMethods=['segmentClear','testSegmentClear','testWalkable','terrainValid','propsAt','chunk'].map(k=>[k,Navigation.prototype[k]]),fieldMethods=Object.getOwnPropertyNames(TerrainField.prototype).filter(k=>k!=='constructor'&&typeof TerrainField.prototype[k]==='function').map(k=>[k,TerrainField.prototype[k]]),segment=Navigation.prototype.segmentClear;
const native=v=>navMethods.every(([k,f])=>v[k]===f)&&Object.getPrototypeOf(v.field)===TerrainField.prototype&&fieldMethods.every(([k,f])=>v.field[k]===f);
const physical=v=>JSON.stringify([v.obstacles,[...(v.suppressed??[])],v.config,v.profile,v.field.c,v.field.seed,v.field.phase,v.field.settlementSite,v.field.canyon,v.field.desert,v.field.wetland,v.field.riverLevel,v.field.riverActive,v.field.pondsActive,v.field.desertWind,v.field.featureCell]);
// OFF-by-default QA immutable synchronous lease. Only directed fractional
// animal/null-ignore queries are cached. Every miss runs original segmentClear
// (including native solids/props/coarse/refinement). Production remains live.
export function withNativeFractionalSegmentCache(view,compute,{mode='off',limit=65536,measureLookup=false,sampleMemory=()=>null,onDiagnostics=()=>{}}={}){
 if(typeof measureLookup!=='boolean'||typeof sampleMemory!=='function'||!['off','diagnose','cache'].includes(mode)||!Number.isSafeInteger(limit)||limit<1||limit>65536)throw Error('Invalid QA fractional segment options');
 const stats={mode,canonical:false,queries:0,hits:0,misses:0,bypasses:0,entries:0,evictions:0,maxEntries:0,keyLookupMs:0,retainedKeyCharacters:0,maxKeyCharacters:0};if(mode==='off'){const r=compute(view);onDiagnostics(stats);return r;}
 stats.canonical=native(view);if(!stats.canonical){const r=compute(view);onDiagnostics(stats);return r;}
 const field=view.field,obstacles=view.obstacles,version=view.version,chunks=view.chunks,signature=physical(view),memo=new Map(),shadow=Object.create(view);let active=true;
 shadow.segmentClear=function(start,end,radius,ignore,worker){
  if(!active)return view.segmentClear(start,end,radius,ignore,worker);stats.queries++;
  const coords=[start.x,start.z,end.x,end.z,radius],grid=coords.slice(0,4).every(Number.isInteger);
  if(grid||worker!==false||ignore!==null||this.workerSweep||!coords.every(x=>Number.isFinite(x)&&!Object.is(x,-0))){stats.bypasses++;return segment.call(this,start,end,radius,ignore,worker);}
  const begin=measureLookup?performance.now():0,key=coords.join(','),hit=mode==='cache'&&memo.has(key),value=hit?memo.get(key):undefined;if(measureLookup)stats.keyLookupMs+=performance.now()-begin;if(hit){stats.hits++;return value;}
  stats.misses++;const result=segment.call(this,start,end,radius,ignore,worker);
  if(mode==='cache'){if(memo.size>=limit){const oldest=memo.keys().next().value;stats.retainedKeyCharacters-=oldest.length;evictOldest(memo);stats.evictions++;}memo.set(key,result);stats.retainedKeyCharacters+=key.length;stats.entries=memo.size;stats.maxEntries=Math.max(stats.maxEntries,memo.size);stats.maxKeyCharacters=Math.max(stats.maxKeyCharacters,stats.retainedKeyCharacters);}return result;
 };
 try{const result=compute(shadow);if(result?.then)throw Error('QA fractional lease must remain synchronous');if(view.field!==field||view.obstacles!==obstacles||view.chunks!==chunks||view.version!==version||physical(view)!==signature||!native(view))throw Error('QA fractional physical inputs changed; reject certificate');return result;}
 finally{active=false;try{onDiagnostics({...stats,memorySample:sampleMemory()});}finally{memo.clear();}}
}

// Diagnostic-only: exact scalar reuse on a borrowed predictive navigation view.
// No rounding, topology caching, negative path caching or production import.
export function installProofSurfaceMemo(view,{capacity=32768}={}){
 if(!Number.isSafeInteger(capacity)||capacity<1)throw RangeError('Positive bounded capacity required');
 const descriptor=Object.getOwnPropertyDescriptor(view,'workerSurface'),original=view.workerSurface;
 if(typeof original!=='function')throw TypeError('Native workerSurface required');
 const cache=new Map(),stats={hits:0,misses:0,evictions:0,invalidations:0,peakEntries:0,capacity};
 let epoch=null,restored=false;
 const numberKey=n=>Object.is(n,-0)?'-0':String(n);
 const wrapped=function(x,z){
  const next=[this.version,this.field,this.field?.surface,this.field?.riverLevel,this.field?.canyon];
  if(!epoch||next.some((v,i)=>!Object.is(v,epoch[i]))){if(epoch)stats.invalidations++;cache.clear();epoch=next;}
  if(!Number.isFinite(x)||!Number.isFinite(z))return original.call(this,x,z);
  const key=numberKey(x)+','+numberKey(z);
  if(cache.has(key)){stats.hits++;return cache.get(key);}
  stats.misses++;const value=original.call(this,x,z);
  if(!Number.isFinite(value))return value;
  if(cache.size>=capacity){cache.delete(cache.keys().next().value);stats.evictions++;}
  cache.set(key,value);stats.peakEntries=Math.max(stats.peakEntries,cache.size);return value;
 };
 Object.defineProperty(view,'workerSurface',{value:wrapped,writable:true,configurable:true,enumerable:descriptor?.enumerable??true});
 return {stats,restore(){if(restored)return;restored=true;cache.clear();if(descriptor)Object.defineProperty(view,'workerSurface',descriptor);else delete view.workerSurface;}};
}

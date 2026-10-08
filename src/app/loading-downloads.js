// Time/byte estimation is separate from cache evidence and verified world readiness.
export function downloadCacheEvidence(timing){
 if(!timing)return 'unknown';
 if(timing.transferSize===0&&timing.decodedBodySize>0)return 'browser-cache';
 if(timing.responseStatus===304&&timing.decodedBodySize>0)return 'validated-cache';
 if(timing.transferSize>0&&timing.encodedBodySize>0)return 'network';
 return 'unknown';
}
function unionDuration(intervals){let start=null,end=null,total=0;intervals.sort((a,b)=>a[0]-b[0]);for(const [a,b] of intervals){if(start===null){start=a;end=b;}else if(a<=end)end=Math.max(end,b);else{total+=end-start;start=a;end=b;}}return total+(start===null?0:end-start);}
export class LoadingDownloads {
 constructor({now=()=>performance.now(),expectedBytes=()=>null,bytesPerSecond=1250000,latencyMs=200,unknownBytes=262144}={}){
  if(!(bytesPerSecond>0)||!(unknownBytes>0)||!(latencyMs>=0))throw Error('Invalid download estimate');
  this.now=now;this.expectedBytes=expectedBytes;this.bytesPerSecond=bytesPerSecond;this.latencyMs=latencyMs;this.unknownBytes=unknownBytes;this.requests=new Map();this.nextId=0;this.disposed=false;
 }
 begin(url,{kind='fetch',start=this.now()}={}){if(this.disposed)return null;const id=++this.nextId,expected=this.expectedBytes(url),known=Number.isFinite(expected)&&expected>0;this.requests.set(id,{id,url,kind,start,end:null,loaded:0,total:known?expected:null,totalEvidence:known?'manifest-estimate':'unknown',cache:'unknown',failed:false});return id;}
 update(id,loaded,total=null,{evidence='loader-estimate'}={}){const request=this.requests.get(id);if(this.disposed||!request||request.end!==null)return;if(Number.isFinite(loaded)&&loaded>=0)request.loaded=Math.max(request.loaded,loaded);if(Number.isFinite(total)&&total>0){request.total=total;request.totalEvidence=evidence;}}
 applyTiming(id,timing){const request=this.requests.get(id);if(this.disposed||!request||!timing)return;request.cache=downloadCacheEvidence(timing);request.timing={startTime:timing.startTime,responseEnd:timing.responseEnd,transferSize:timing.transferSize,encodedBodySize:timing.encodedBodySize,decodedBodySize:timing.decodedBodySize,responseStatus:timing.responseStatus};if(timing.decodedBodySize>0){request.loaded=Math.max(request.loaded,timing.decodedBodySize);if(request.end!==null&&!request.failed){request.total=request.loaded;request.totalEvidence='completed-body';}}}
 finish(id,{timing=null,loaded=null,failed=false}={}){const request=this.requests.get(id);if(this.disposed||!request||request.end!==null)return;this.update(id,loaded);request.end=this.now();request.failed=failed;this.applyTiming(id,timing);if(!failed&&request.loaded>0){request.total=request.loaded;request.totalEvidence='completed-body';}}
 markCached(id){const request=this.requests.get(id);if(this.disposed||!request)return;request.end=request.start;request.cache='application-cache';}
 cacheHit(url){const id=this.begin(url,{kind:'collection-cache'});this.markCached(id);return id;}
 snapshot({details=false}={}){
  const now=this.now(),intervals=[];let loaded=0,total=0,remaining=0,pending=0,cacheHits=0,unknown=0,network=0,failures=0,unknownTotals=0;
  for(const request of this.requests.values()){
   if(request.cache.endsWith('cache')){cacheHits++;continue;}
   if(request.cache==='network')network++;else unknown++;
   if(request.failed)failures++;
   const complete=request.end!==null;if(!complete)pending++;
   const size=Math.max(request.loaded,request.total??this.unknownBytes);if(request.total===null)unknownTotals++;
   total+=size;loaded+=complete?size:Math.min(request.loaded,size);if(!complete)remaining+=Math.max(0,size-request.loaded);
   const timing=request.timing,begin=Number.isFinite(timing?.startTime)?timing.startTime:request.start,end=Number.isFinite(timing?.responseEnd)&&timing.responseEnd>=begin?timing.responseEnd:(request.end??now);
   intervals.push([begin,Math.max(begin,end)]);
  }
  const observedMs=unionDuration(intervals),remainingMs=pending?remaining/this.bytesPerSecond*1000+this.latencyMs:0;
  return {progress:total?Math.min(pending?.99:1,loaded/total):1,estimatedMs:observedMs+remainingMs,observedMs,remainingMs,pending,cacheHits,network,unknown,unknownTotals,failures,loadedBytes:loaded,totalBytes:total,estimated:unknown>0||pending>0||unknownTotals>0,byteScope:'Decoded response body; pending totals and time are estimates. Parallel intervals are counted once.',...(details?{requests:[...this.requests.values()].map(request=>({...request}))}:{})};
 }
 dispose(){this.disposed=true;}
}

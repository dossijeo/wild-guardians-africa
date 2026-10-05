// Cache compressed audio responses, never decoded PCM. Blob slices satisfy
// media byte-range requests from the stored file without an ArrayBuffer copy.
const CACHE='wild-guardians-music-compressed-v1',pending=new Map();
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function remember(url,cache){
  if(!pending.has(url)){
    const task=fetch(url).then(response=>response.ok&&response.status===200?cache.put(url,response):undefined).finally(()=>pending.delete(url));
    pending.set(url,task);
  }
  return pending.get(url);
}
async function media(request,event){
  const url=new URL(request.url),offline=url.searchParams.has('music-cache-only');url.searchParams.delete('music-cache-only');
  const key=url.href,cache=await caches.open(CACHE),stored=await cache.match(key);
  if(!stored){
    if(offline)return new Response('Audio is not cached',{status:503});
    const response=await fetch(request);
    if(response.ok){
      if(response.status===200)event.waitUntil(cache.put(key,response.clone()).catch(()=>{}));
      else if(response.status===206){
        const complete=/^bytes 0-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range')||'');
        if(complete&&Number(complete[1])+1===Number(complete[2])){
          const headers=new Headers(response.headers);headers.delete('Content-Range');
          event.waitUntil(cache.put(key,new Response(response.clone().body,{status:200,headers})).catch(()=>{}));
        }else event.waitUntil(remember(key,cache).catch(()=>{}));
      }
    }
    return response;
  }
  const range=request.headers.get('Range');if(!range)return stored;
  const blob=await stored.blob(),match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${blob.size}`}});
  const start=match[1]?Number(match[1]):Math.max(0,blob.size-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(Number(match[2]),blob.size-1):blob.size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=blob.size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${blob.size}`}});
  return new Response(blob.slice(start,end+1),{status:206,headers:{'Content-Type':stored.headers.get('Content-Type')||'audio/mpeg','Content-Range':`bytes ${start}-${end}/${blob.size}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes','X-Wild-Guardians-Music':'disk-cache'}});
}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method==='GET'&&request.destination==='audio'&&new URL(request.url).origin===self.location.origin)event.respondWith(media(request,event));
});

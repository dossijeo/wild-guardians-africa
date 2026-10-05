import {assetUrl} from '../rendering/asset-url.js';
const CACHE='wild-guardians-music-compressed-v1';

// Disk stores the original compressed file. RAM receives only the requested
// compressed byte window before decode. Without storage, use HTTP ranges.
export function musicRangeReader({fetch=globalThis.fetch,caches=globalThis.caches,resolve=assetUrl}={}){
  let storage=caches?caches.open(CACHE).catch(()=>null):Promise.resolve(null);
  const fills=new Map(),stats={diskReads:0,networkReads:0};
  async function fill(url,cache){
    if(!fills.has(url)){
      const pending=(async()=>{
        stats.networkReads++;const response=await fetch(url);if(!response.ok||response.status!==200)throw Error('Unable to cache original music file');
        try{await cache.put(url,response.clone());return null;}
        catch{storage=Promise.resolve(null);return response.blob();}
      })();fills.set(url,pending);pending.then(()=>fills.delete(url),()=>fills.delete(url));
    }
    return fills.get(url);
  }
  async function readRange(source,start,end){
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start)throw Error('Invalid music byte window');
    const url=resolve(source),cache=await storage;
    if(cache){
      let stored=await cache.match(url);
      if(!stored){const fallback=await fill(url,cache);if(fallback)return fallback.slice(start,end).arrayBuffer();stored=await cache.match(url);}
      if(stored){stats.diskReads++;const file=await stored.blob();if(end>file.size)throw Error('Cached music file is truncated');return file.slice(start,end).arrayBuffer();}
    }
    stats.networkReads++;const response=await fetch(url,{headers:{Range:`bytes=${start}-${end-1}`}});
    if(!response.ok)throw Error('Unable to read original music window');
    if(response.status===200){const file=await response.blob();if(end>file.size)throw Error('Music file is truncated');return file.slice(start,end).arrayBuffer();}
    const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range')||'');
    if(response.status!==206||!range||Number(range[1])!==start||Number(range[2])!==end-1)throw Error('Music range response does not match its index');
    const encoded=await response.arrayBuffer();if(encoded.byteLength!==end-start)throw Error('Music byte window is truncated');return encoded;
  }
  return {readRange,stats};
}

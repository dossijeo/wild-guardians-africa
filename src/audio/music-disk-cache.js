let registration;
// Keep compressed media in Cache Storage. Unsupported/denied service workers
// leave ordinary media streaming available; they never force PCM decoding.
export function prepareMusicDiskCache(){
  if(typeof navigator==='undefined'||!navigator.serviceWorker||!globalThis.isSecureContext)return Promise.resolve(null);
  registration??=navigator.serviceWorker.register(new URL(import.meta.env?.DEV?'../../music-cache-sw.js':'../music-cache-sw.js',import.meta.url)).then(async worker=>{
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller)await new Promise(resolve=>{
      const timer=setTimeout(finish,3000);
      function finish(){clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',finish);resolve();}
      navigator.serviceWorker.addEventListener('controllerchange',finish,{once:true});
      if(navigator.serviceWorker.controller)finish();
    });
    return navigator.serviceWorker.controller?worker:null;
  }).catch(()=>null);
  return registration;
}

let registration;
// Keep compressed media in Cache Storage. Unsupported/denied service workers
// leave ordinary media streaming available; they never force PCM decoding.
export function prepareMusicDiskCache(){
  if(typeof navigator==='undefined'||!navigator.serviceWorker||!globalThis.isSecureContext)return Promise.resolve(null);
  registration??=new Promise(resolve=>{
    const serviceWorker=navigator.serviceWorker;let settled=false,onController;
    // Bound the entire optional preparation, including register() and ready.
    // A stalled activation must not indefinitely prevent normal music streaming.
    const timer=setTimeout(()=>finish(null),3000);
    function finish(worker){
      if(settled)return;settled=true;clearTimeout(timer);
      if(onController)serviceWorker.removeEventListener('controllerchange',onController);
      resolve(worker);
    }
    (async()=>{
      const worker=await serviceWorker.register(new URL(import.meta.env?.DEV?'../../music-cache-sw.js':'../music-cache-sw.js',import.meta.url));
      if(settled)return;await serviceWorker.ready;if(settled)return;
      onController=()=>{if(serviceWorker.controller)finish(worker);};
      serviceWorker.addEventListener('controllerchange',onController);
      onController();
    })().catch(()=>finish(null));
  });
  return registration;
}

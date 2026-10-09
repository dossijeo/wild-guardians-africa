// Images belong to the retained HUD cache. Bound this loading owner's wait,
// not the shared requests: timeout/error uses the coherent CSS wood fallback.
export function prepareLoadingFrames(load,{signal,timeout=5000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(signal?.aborted)return Promise.reject(signal.reason??new DOMException('Loading cancelled','AbortError'));
 return new Promise((resolve,reject)=>{
  let settled=false,timer;
  const finish=(value,error)=>{if(settled)return;settled=true;clearTimer(timer);signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve(value);};
  const abort=()=>finish(null,signal.reason??new DOMException('Loading cancelled','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});timer=setTimer(()=>finish(null),timeout);
  Promise.resolve().then(()=>settled?null:load()).then(images=>finish(images),()=>finish(null));
 });
}

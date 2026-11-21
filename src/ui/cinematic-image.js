// Cancel images that have not yet been presented when a cinematic is closed.
export function loadCinematicImage(url,{signal,createImage=()=>new Image()}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Cinematic cancelled','AbortError'));return;}
  const image=createImage();image.decoding='async';let settled=false;
  const cleanup=()=>{signal?.removeEventListener('abort',abort);image.onload=null;image.onerror=null;};
  const finish=(error)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else if(!image.naturalWidth)reject(Error(`Cinematic image unavailable: ${url}`));else resolve(image);};
  const abort=()=>{if(settled)return;finish(new DOMException('Cinematic cancelled','AbortError'));image.removeAttribute('src');};
  signal?.addEventListener('abort',abort,{once:true});
  if(!image.decode){image.onload=()=>finish();image.onerror=()=>finish(Error(`Cinematic image unavailable: ${url}`));}
  image.src=url;
  if(image.decode)Promise.resolve().then(()=>settled?undefined:image.decode()).then(()=>finish(),finish);
 });
}

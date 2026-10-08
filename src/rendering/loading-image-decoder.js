// One world-owned decoder. Requests transfer disposable compressed copies;
// successful bitmaps belong solely to the receiving Texture, never this pool.
export class LoadingImageDecoder {
 constructor({signal,createWorker=()=>new Worker(new URL('./loading-image-worker.js',import.meta.url),{type:'module'})}={}){
  this.pending=new Map();this.serial=0;this.closed=false;this.signal=signal;
  this.worker=createWorker();this.abort=()=>this.dispose();signal?.addEventListener('abort',this.abort,{once:true});
  this.worker.onmessage=event=>{const {id,bitmap,error,unsupported}=event.data,request=this.pending.get(id);if(this.closed||!request){bitmap?.close();return;}this.pending.delete(id);if(error){bitmap?.close();const failure=Error(error);failure.unsupported=!!unsupported;request.reject(failure);}else if(!bitmap){request.reject(Error('Image decoder returned no bitmap'));}else request.resolve(bitmap);};
  this.worker.onerror=event=>this.dispose(Error(event.message??'Image decoder failed'));
  if(signal?.aborted)this.dispose();
 }
 decode(buffer,type=''){
  if(this.closed)return Promise.reject(Error('Image decoder cancelled'));
  return new Promise((resolve,reject)=>{const id=++this.serial;this.pending.set(id,{resolve,reject});try{const copy=buffer.slice(0);this.worker.postMessage({id,buffer:copy,type},[copy]);}catch(error){this.pending.delete(id);reject(error);}});
 }
 dispose(error=Error('Image decoder cancelled')){if(this.closed)return;this.closed=true;this.signal?.removeEventListener('abort',this.abort);this.worker.terminate();for(const request of this.pending.values())request.reject(error);this.pending.clear();}
}

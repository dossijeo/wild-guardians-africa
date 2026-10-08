// One world-owned decoder. Queue compressed references without copying until a
// bounded slot is available. Successful bitmaps belong only to their Texture.
export class LoadingImageDecoder {
 constructor({signal,maxConcurrent=2,createWorker=()=>new Worker(new URL('./loading-image-worker.js',import.meta.url),{type:'module'})}={}){
  if(!Number.isInteger(maxConcurrent)||maxConcurrent<1)throw Error('Invalid image decoder concurrency');
  this.pending=new Map();this.serial=0;this.closed=false;this.signal=signal;this.maxConcurrent=maxConcurrent;this.active=0;this.transferBytes=0;this.stats={requests:0,peakActive:0,peakTransferBytes:0,peakQueued:0};
  this.worker=createWorker();this.abort=()=>this.dispose();signal?.addEventListener('abort',this.abort,{once:true});
  this.worker.onmessage=event=>{const {id,bitmap,error,unsupported}=event.data,request=this.pending.get(id);if(this.closed||!request){bitmap?.close();return;}this.pending.delete(id);if(request.sent){this.active--;this.transferBytes-=request.byteLength;}if(error){bitmap?.close();const failure=Error(error);failure.unsupported=!!unsupported;request.reject(failure);}else if(!bitmap){request.reject(Error('Image decoder returned no bitmap'));}else request.resolve(bitmap);this.pump();};
  this.worker.onerror=event=>this.dispose(Error(event.message??'Image decoder failed'));
  if(signal?.aborted)this.dispose();
 }
 decode(buffer,type='',{flipY=false,premultiplyAlpha=false}={}){
  if(this.closed)return Promise.reject(Error('Image decoder cancelled'));
  return new Promise((resolve,reject)=>{const id=++this.serial;this.pending.set(id,{resolve,reject,buffer,type,flipY,premultiplyAlpha,sent:false,byteLength:buffer.byteLength});this.stats.requests++;this.stats.peakQueued=Math.max(this.stats.peakQueued,this.pending.size-this.active);this.pump();});
 }
 pump(){
  if(this.closed)return;
  for(const [id,request] of this.pending){if(this.active>=this.maxConcurrent)break;if(request.sent)continue;
   try{const copy=request.buffer.slice(0);this.worker.postMessage({id,buffer:copy,type:request.type,flipY:request.flipY,premultiplyAlpha:request.premultiplyAlpha},[copy]);request.sent=true;request.buffer=null;this.active++;this.transferBytes+=request.byteLength;this.stats.peakActive=Math.max(this.stats.peakActive,this.active);this.stats.peakTransferBytes=Math.max(this.stats.peakTransferBytes,this.transferBytes);}catch(error){this.pending.delete(id);request.reject(error);}
  }
 }
 dispose(error=Error('Image decoder cancelled')){if(this.closed)return;this.closed=true;this.signal?.removeEventListener('abort',this.abort);this.worker.terminate();for(const request of this.pending.values())request.reject(error);this.pending.clear();this.active=0;this.transferBytes=0;}
}

// Presentation-driven latest-state executor: no RAF and no unbounded message queue.
export class GuardianCanvasExecutor {
 constructor(canvas,magicCanvas,image,{onFailure=()=>{},createWorker=()=>new Worker(new URL('./guardian-canvas-worker.js',import.meta.url),{type:'module'}),createBitmap=globalThis.createImageBitmap}={}){
  this.canvas=canvas;this.magicCanvas=magicCanvas;this.onFailure=onFailure;this.closed=false;this.readyState=false;this.inflight=false;this.sequence=0;this.pending=null;
  this.stats={submitted:0,completed:0,coalesced:0,setupMs:0,failed:0};
  this.ready=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  this.timer=setTimeout(()=>this.fail(Error('Guardian worker startup timeout')),15000);
  this.resize();
  try{
   if(!canvas.transferControlToOffscreen||!magicCanvas.transferControlToOffscreen||!createBitmap)throw Error('OffscreenCanvas unavailable');
   this.worker=createWorker();this.worker.onmessage=({data})=>this.receive(data);this.worker.onerror=event=>{event.preventDefault?.();this.fail(Error(event.message??'Guardian worker failed'));};
   Promise.resolve(createBitmap(image,{premultiplyAlpha:'premultiply',colorSpaceConversion:'default'})).then(bitmap=>{
    if(this.closed){bitmap.close();return;}
    try{const surface=canvas.transferControlToOffscreen(),magic=magicCanvas.transferControlToOffscreen();this.transferred=true;this.worker.postMessage({type:'init',canvas:surface,magicCanvas:magic,bitmap,size:this.size},[surface,magic,bitmap]);}catch(error){bitmap.close();this.fail(error);}
   },error=>this.fail(error));
  }catch(error){this.fail(error);}
 }
 resize(){this.size={width:this.canvas.clientWidth,height:this.canvas.clientHeight,magicWidth:this.magicCanvas.clientWidth,dpr:globalThis.devicePixelRatio||1};}
 receive(data){
  if(this.closed)return;
  if(data.type==='error'){this.fail(Error(data.message));return;}
  if(data.type==='ready'){clearTimeout(this.timer);this.readyState=true;this.stats.setupMs=data.setupMs;this.resolve();this.pump();}
  if(data.type==='frame'&&this.inflight&&data.sequence===this.sequence){this.inflight=false;this.stats.completed++;this.pump();}
 }
 render(time,pose){if(this.closed)return;if(this.pending)this.stats.coalesced++;this.pending={time,pose:{...pose,angles:[...pose.angles],offsets:[...pose.offsets]}};this.pump();}
 pump(){if(this.closed||!this.readyState||this.inflight||!this.pending)return;const frame=this.pending;this.pending=null;this.inflight=true;this.stats.submitted++;try{this.worker.postMessage({type:'frame',sequence:++this.sequence,size:this.size,...frame});}catch(error){this.fail(error);}}
 fail(error){if(this.closed)return;const wasReady=this.readyState;this.stats.failed++;this.stats.failure=error.message;this.dispose(error);if(wasReady)this.onFailure(error);}
 dispose(error=Error('Guardian worker disposed')){if(this.closed)return;this.closed=true;this.readyState=false;this.pending=null;this.inflight=false;clearTimeout(this.timer);this.worker?.terminate();this.reject(error);}
}

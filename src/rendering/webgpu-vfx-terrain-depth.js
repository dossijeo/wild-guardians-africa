// Coordinates the optional terrain depth pass without waiting in a frame.
// The capture owns its targets; the binding keeps its identity on resize.
export function createWebGpuVfxTerrainDepth({capture,binding,signal,now=()=>performance.now(),onError=()=>{}}={}){
 if(!capture||typeof capture.prepare!=='function'||typeof capture.render!=='function'||typeof capture.resize!=='function'||typeof capture.invalidate!=='function'||typeof capture.dispose!=='function'||typeof binding?.setDepthTexture!=='function'||typeof now!=='function'||typeof onError!=='function')throw TypeError('Invalid VFX terrain depth');
 let closed=false,preparing=null,resizing=null,desired=null,sizeValid=true,retryAt=0;
 function report(kind,error){if(!closed&&!signal?.aborted&&error?.name!=='AbortError'){retryAt=now()+1000;onError(kind,error);}}
 function prepare(){if(closed||preparing||resizing||!sizeValid||now()<retryAt)return;preparing=Promise.resolve().then(()=>capture.prepare({signal})).catch(error=>report('ground-depth',error)).finally(()=>{preparing=null;});}
 function resize(w,h){if(closed)return;if(!Number.isSafeInteger(w)||w<1||!Number.isSafeInteger(h)||h<1)throw TypeError('Invalid VFX depth size');desired={w,h};sizeValid=false;if(resizing)return;resizing=Promise.resolve().then(async()=>{while(desired&&!closed){const next=desired;desired=null;await capture.resize(next.w,next.h,{signal,publish:depth=>{if(closed||signal?.aborted)throw new DOMException('Ground depth cancelled','AbortError');binding.setDepthTexture(depth);}});if(!desired)sizeValid=true;}}).catch(error=>report('ground-depth-resize',error)).finally(()=>{resizing=null;if(desired&&!closed)resize(desired.w,desired.h);});}
 return {
  afterPrepare(vfx){if(closed||!vfx)return false;vfx.setSoftDepthEnabled(false);if(!vfx.needsSoftDepth||!sizeValid||resizing)return false;try{if(capture.ready&&capture.render()){vfx.setSoftDepthEnabled(true);return true;}prepare();}catch(error){capture.invalidate();report('ground-depth',error);}return false;},
  invalidate(){if(!closed)capture.invalidate();},resize,
  dispose(){if(closed)return;closed=true;desired=null;capture.dispose();},
 };
}

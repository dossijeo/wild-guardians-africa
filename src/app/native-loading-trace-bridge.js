import {createNativeLoadingTrace} from './native-loading-trace.js';
const freeze=data=>{if(data&&typeof data==='object'){for(const value of Object.values(data))freeze(value);Object.freeze(data);}return data;};
function graphicsSnapshot(renderer){
 try{
  const gl=renderer?.getContext?.();if(!gl)return {available:false,reason:'Existing renderer context unavailable'};
  const scalar=name=>{try{const value=gl.getParameter(gl[name]);return typeof value==='string'?value.slice(0,384):{unavailable:true};}catch(error){return {error:String(error).slice(0,240)};}};
  const result={available:true,version:scalar('VERSION'),vendor:scalar('VENDOR'),renderer:scalar('RENDERER'),scope:'Single opt-in snapshot of the existing renderer context; no new context or benchmark.'};
  try{const extension=gl.getExtension('WEBGL_debug_renderer_info');const unmasked=key=>{const value=gl.getParameter(key);return typeof value==='string'?value.slice(0,384):{unavailable:true};};result.unmasked=extension?{vendor:unmasked(extension.UNMASKED_VENDOR_WEBGL),renderer:unmasked(extension.UNMASKED_RENDERER_WEBGL)}:{unavailable:true};}catch(error){result.unmasked={error:String(error).slice(0,240)};}
  return result;
 }catch(error){return {available:false,error:String(error).slice(0,240)};}
}
export function installNativeLoadingTrace(world,{scope=globalThis,now=()=>performance.now(),Weak=globalThis.WeakRef}={}){
 let enabled=false;try{enabled=scope.__desktopSmokeLoadingTrace===true;}catch{return null;}
 if(!enabled||typeof Weak!=='function')return null;
 let reference;try{reference=new Weak(world);}catch{return null;}
 let signal=world.loading.signal;if(world.disposed||signal.aborted)return null;
 const graphics=graphicsSnapshot(world.renderer),trace=createNativeLoadingTrace({enabled:true}),tokens=new Set();let previous=null,previousOwned=false,closed=false,final=null,forwarding=false;
 function witness(...args){if(closed||forwarding)return;forwarding=true;try{return typeof previous==='function'?previous.apply(this,args):undefined;}finally{forwarding=false;try{trace.witness(...args);}catch{}}}
 witness.onAwaitStart=function(...args){if(closed)return null;const token={};let priorStart,priorEnd;
  try{priorStart=previous?.onAwaitStart;priorEnd=previous?.onAwaitEnd;}catch{}
  if(typeof priorStart==='function'){token.end=typeof priorEnd==='function'?priorEnd:null;token.context=this===witness?previous:this;token.previous=priorStart.apply(token.context,args);}
  try{token.trace=trace.witness.onAwaitStart(...args);}catch{}
  tokens.add(token);return token;
 };
 witness.onAwaitEnd=function(token,...args){if(closed||!tokens.delete(token))return;
  try{return token.end?.call(token.context,token.previous,...args);}finally{try{trace.witness.onAwaitEnd(token.trace,...args);}catch{}token.end=null;token.context=null;token.previous=null;token.trace=null;}
 };
 const connect=()=>{if(closed)return;const live=reference?.deref();if(!live||live.disposed){close({cancelled:true});return;}try{if(live.onLoadingSpan!==witness){previous=live.onLoadingSpan;previousOwned=Object.hasOwn(live,'onLoadingSpan');live.onLoadingSpan=witness;}}catch{close({cancelled:true});}};
 const close=({cancelled=false}={})=>{if(closed)return final;
  let at;try{at=now();}catch{}final=freeze({...trace.snapshot({at}),graphics,closed:true,cancelled});closed=true;
  const live=reference?.deref();try{if(live?.onLoadingSpan===witness){if(previousOwned)live.onLoadingSpan=previous;else delete live.onLoadingSpan;}}catch{}
  signal?.removeEventListener('abort',abort);signal=null;
  for(const token of tokens){token.end=null;token.context=null;token.previous=null;token.trace=null;}tokens.clear();previous=null;reference=null;trace.close();return final;
 };
 const abort=()=>close({cancelled:true}),owner={connect,close};
 try{Object.defineProperty(scope,'__wildGuardiansNativeLoadingTrace',{configurable:true,value:Object.freeze({get report(){return close();}})});}catch{trace.close();return null;}
 connect();if(!closed)signal.addEventListener('abort',abort,{once:true});world=null;return owner;
}

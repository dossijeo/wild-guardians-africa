// OrbitControls emits change before the terrain camera wrapper applies its
// safety correction. Dispatch after the current input task, never the raw pose.
export function installWebGpuCameraInput({controls,context,schedule=queueMicrotask}){
 if(typeof controls?.addEventListener!=='function'||typeof controls?.removeEventListener!=='function'||typeof context!=='function'||typeof schedule!=='function')throw TypeError('Invalid WebGPU camera input');
 let closed=false,pending=null,scheduled=false;
 function change(){
  if(closed)return;const binding=context();if(!binding)return;pending=binding;if(scheduled)return;scheduled=true;
  schedule(()=>{scheduled=false;const expected=pending;pending=null;if(closed||!expected||context()!==expected)return;expected.sync();});
 }
 controls.addEventListener('change',change);
 return ()=>{if(closed)return;closed=true;pending=null;controls.removeEventListener('change',change);};
}

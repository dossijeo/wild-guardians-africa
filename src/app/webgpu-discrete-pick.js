// Placement and wall strokes retain the legacy picker; discrete selection can
// fall back when the confirmed visual scene is not yet complete.
export function createWebGpuDiscretePick({context,deliver,fallback=null,onError=()=>{}}){
 if(typeof context!=='function'||typeof deliver!=='function'||fallback!==null&&typeof fallback!=='function'||typeof onError!=='function')throw TypeError('Invalid WebGPU pick adapter');
 return (event,gesture)=>{
  const initial=context();
  const supported=!initial?.tool||initial.tool.kind==='awakening'||initial.tool.kind==='spell'&&['attack','growth','multiply'].includes(initial.tool.spell);
  if(!initial?.client||!supported||(!initial.tool||initial.tool.kind==='awakening')&&!fallback)return false;
  const rect=initial.canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return false;
  const input={clientX:event.clientX,clientY:event.clientY},coordinate={x:(input.clientX-rect.left)/rect.width*2-1,y:1-(input.clientY-rect.top)/rect.height*2};
  if(!Number.isFinite(coordinate.x)||!Number.isFinite(coordinate.y)||Math.abs(coordinate.x)>1||Math.abs(coordinate.y)>1)return false;
  // Synchronize camera before taking the version captured by the pick client.
  initial.sync();
  Promise.resolve().then(()=>initial.client.pick(coordinate)).then(result=>{
   const current=context();
   if(current?.owner!==initial.owner||current?.state!==initial.state||current?.tool!==initial.tool||current?.client!==initial.client)return;
   if(result.incomplete===true&&fallback){fallback(initial,input,gesture);return;}
   deliver({...result,...gesture});
  }).catch(error=>{if(error?.message==='Stale WebGPU pick')return;const current=context();if(current?.owner===initial.owner&&current?.state===initial.state&&current?.client===initial.client)onError(error);});
  return true;
 };
}

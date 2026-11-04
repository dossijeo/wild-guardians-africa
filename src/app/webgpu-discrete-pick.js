// Route only spell targets represented by the confirmed Worker picker. Other
// interactions retain the synchronous scene picker until their parity exists.
export function createWebGpuDiscretePick({context,deliver,onError=()=>{}}){
 if(typeof context!=='function'||typeof deliver!=='function'||typeof onError!=='function')throw TypeError('Invalid WebGPU pick adapter');
 return (event,gesture)=>{
  const initial=context();
  if(!initial?.client||initial.tool?.kind!=='spell'||!['attack','growth','multiply'].includes(initial.tool.spell))return false;
  const rect=initial.canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return false;
  const coordinate={x:(event.clientX-rect.left)/rect.width*2-1,y:1-(event.clientY-rect.top)/rect.height*2};
  if(!Number.isFinite(coordinate.x)||!Number.isFinite(coordinate.y)||Math.abs(coordinate.x)>1||Math.abs(coordinate.y)>1)return false;
  // Synchronize camera before taking the version captured by the pick client.
  initial.sync();
  Promise.resolve().then(()=>initial.client.pick(coordinate)).then(result=>{
   const current=context();
   if(current?.owner!==initial.owner||current?.state!==initial.state||current?.tool!==initial.tool||current?.client!==initial.client)return;
   deliver({...result,...gesture});
  }).catch(error=>{if(error?.message==='Stale WebGPU pick')return;const current=context();if(current?.owner===initial.owner&&current?.state===initial.state&&current?.client===initial.client)onError(error);});
  return true;
 };
}

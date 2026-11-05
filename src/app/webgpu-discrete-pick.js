// Placement and wall strokes retain the legacy picker; discrete selection can
// fall back when the confirmed visual scene is not yet complete.
export function createWebGpuDiscretePick({context,deliver,fallback=null,onError=()=>{},allowTerrainTools=false,allowStableCameraPick=false,onTrace=null}){
 if(typeof context!=='function'||typeof deliver!=='function'||fallback!==null&&typeof fallback!=='function'||typeof onError!=='function'||onTrace!==null&&typeof onTrace!=='function')throw TypeError('Invalid WebGPU pick adapter');
 return (event,gesture)=>{
  const initial=context();
  const terrainTool=allowTerrainTools&&['plant','center','wall','village'].includes(initial?.tool?.kind),supported=terrainTool||!initial?.tool||initial.tool.kind==='awakening'||initial.tool.kind==='spell'&&['attack','growth','multiply'].includes(initial.tool.spell);
  if(!initial?.client||!supported||(!initial.tool||initial.tool.kind==='awakening')&&!fallback)return false;
  const rect=initial.canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return false;
  const input={clientX:event.clientX,clientY:event.clientY},coordinate={x:(input.clientX-rect.left)/rect.width*2-1,y:1-(input.clientY-rect.top)/rect.height*2};
  if(!Number.isFinite(coordinate.x)||!Number.isFinite(coordinate.y)||Math.abs(coordinate.x)>1||Math.abs(coordinate.y)>1)return false;
  const started=onTrace?performance.now():0,trace=onTrace?(stage,details={})=>{try{onTrace({stage,elapsed:performance.now()-started,coordinate,...details});}catch{}}:null;trace?.('requested');
  // Synchronize camera before taking the version captured by the pick client.
  initial.sync();
  Promise.resolve().then(()=>initial.client.pick(terrainTool?{...coordinate,terrainOnly:true}:coordinate,allowStableCameraPick&&initial.tool?.kind==='spell'&&initial.tool.spell==='attack'?{allowStableCamera:true}:undefined)).then(result=>{
   const current=context();
   if(current?.owner!==initial.owner||current?.state!==initial.state||current?.tool!==initial.tool||current?.client!==initial.client){trace?.('context-changed');return;}
   if(terrainTool&&!result.point){trace?.('no-terrain',{sequence:result.sequence});return;}
   if(result.incomplete===true&&fallback){trace?.('fallback',{sequence:result.sequence,entityId:result.entityId});fallback(initial,input,gesture);return;}
   trace?.('delivered',{sequence:result.sequence,entityId:result.entityId,incomplete:result.incomplete===true});deliver({...result,...gesture});
  }).catch(error=>{if(error?.message==='Stale WebGPU pick'){trace?.('stale',{reason:error.reason??null,details:error.details??null});return;}trace?.('error',{message:String(error?.message??error)});const current=context();if(current?.owner===initial.owner&&current?.state===initial.state&&current?.client===initial.client)onError(error);});
  return true;
 };
}

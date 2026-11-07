// Placement and wall strokes retain the legacy picker; discrete selection can
// fall back when the confirmed visual scene is not yet complete.
export function createWebGpuDiscretePick({context,deliver,fallback=null,onError=()=>{},onStart=null,allowTerrainTools=false,allowStableCameraPick=false,allowGuardianContext=false,onTrace=null}){
 if(typeof context!=='function'||typeof deliver!=='function'||fallback!==null&&typeof fallback!=='function'||typeof onError!=='function'||onStart!==null&&typeof onStart!=='function'||onTrace!==null&&typeof onTrace!=='function')throw TypeError('Invalid WebGPU pick adapter');
 return (event,gesture)=>{
  const initial=context();
  const terrainTool=allowTerrainTools&&['plant','center','wall','village'].includes(initial?.tool?.kind),supported=terrainTool||!initial?.tool||initial.tool.kind==='awakening'||initial.tool.kind==='spell'&&['attack','growth','multiply','shield'].includes(initial.tool.spell);
  if(!initial?.client||!supported||(!initial.tool||initial.tool.kind==='awakening')&&!fallback)return false;
  const rect=initial.canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return false;
  // CSS layout can change before the resize observer or Worker sees it. A
  // response for the old rectangle must not be applied to the new viewport.
  const viewport=[rect.left,rect.top,rect.width,rect.height,initial.canvas.width,initial.canvas.height];
  const sameViewport=binding=>{if(binding?.canvas!==initial.canvas)return false;const now=binding.canvas.getBoundingClientRect();return [now.left,now.top,now.width,now.height,binding.canvas.width,binding.canvas.height].every((value,index)=>value===viewport[index]);};
  const input={clientX:event.clientX,clientY:event.clientY},coordinate={x:(input.clientX-rect.left)/rect.width*2-1,y:1-(input.clientY-rect.top)/rect.height*2};
  if(!Number.isFinite(coordinate.x)||!Number.isFinite(coordinate.y)||Math.abs(coordinate.x)>1||Math.abs(coordinate.y)>1)return false;
  const feedback=onStart?.(initial,input)??null;
  const started=onTrace?performance.now():0,trace=onTrace?(stage,details={})=>{try{onTrace({stage,elapsed:performance.now()-started,coordinate,...details});}catch{}}:null;trace?.('requested');
  // Synchronize camera before taking the version captured by the pick client.
  initial.sync();
  const attack=initial.tool?.kind==='spell'&&initial.tool.spell==='attack',options=attack&&(allowStableCameraPick||allowGuardianContext)?{...(allowStableCameraPick?{allowStableCamera:true}:{}),...(allowGuardianContext?{includeGuardianContext:true}:{})}:undefined;
  const cancelled=Symbol('cancelled pick');
  const currentContext=current=>current?.owner===initial.owner&&current?.state===initial.state&&current?.tool===initial.tool&&current?.client===initial.client;
  const rejectViewport=()=>{trace?.('viewport-changed');onError(Error('La vista ha cambiado; vuelve a seleccionar el objetivo.'));};
  Promise.resolve().then(()=>{const current=context();if(!currentContext(current)){trace?.('context-changed');return cancelled;}if(!sameViewport(current)){rejectViewport();return cancelled;}return initial.client.pick(terrainTool?{...coordinate,terrainOnly:true}:coordinate,options);}).then(result=>{
   if(result===cancelled)return;
   const current=context();
   if(!currentContext(current)){trace?.('context-changed');return;}if(!sameViewport(current)){rejectViewport();return;}
   if(result.incomplete===true){if(fallback){trace?.('fallback',{sequence:result.sequence,entityId:result.entityId});fallback(initial,input,gesture);}else{trace?.('incomplete',{sequence:result.sequence});onError(Error('La escena todavía no está preparada; vuelve a seleccionar el objetivo.'));}return;}
   if(terrainTool&&!result.point){trace?.('no-terrain',{sequence:result.sequence});return;}
   trace?.('delivered',{sequence:result.sequence,entityId:result.entityId,incomplete:result.incomplete===true});deliver({...result,...gesture,...(feedback?{structureFeedback:feedback}:{})});
  }).catch(error=>{if(error?.message==='Stale WebGPU pick'){trace?.('stale',{reason:error.reason??null,details:error.details??null});return;}trace?.('error',{message:String(error?.message??error)});const current=context();if(current?.owner===initial.owner&&current?.state===initial.state&&current?.tool===initial.tool&&current?.client===initial.client)onError(error);}).finally(()=>feedback?.cancelUnlessBound());
  return true;
 };
}

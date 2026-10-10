// Scalar smoke-only provenance; no actions, World references or clock mutation.
export function publishNativeSmokeCoverage(state,phase,{scope=globalThis}={}){
 if(scope.__desktopSmokeCoverage!==true)return;
 const actual=state?Object.freeze({biome:state.biome,culture:state.culture,seed:String(state.seed),slotId:state.slotId,day:state.day,time:state.time}):null;
 Object.defineProperty(scope,'__wildGuardiansSmokeCoverage',{value:Object.freeze({phase,actual}),configurable:true,writable:false});
}

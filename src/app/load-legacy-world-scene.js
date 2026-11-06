// Importing the legacy scene also loads its WebGL dependencies. The Worker
// presentation never requests it. Cancellation is checked before constructing
// an owner because a dynamic import itself cannot be aborted.
export async function loadLegacyWorldScene({isCurrent,load=()=>import('../rendering/scene.js')}={}){
 if(typeof isCurrent!=='function'||typeof load!=='function')throw TypeError('Invalid legacy scene request');
 const module=await load();
 if(!isCurrent())throw new DOMException('Loading cancelled','AbortError');
 if(typeof module?.WorldScene!=='function')throw TypeError('Invalid legacy scene module');
 return module.WorldScene;
}

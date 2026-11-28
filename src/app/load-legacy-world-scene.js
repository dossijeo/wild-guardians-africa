// Importing the legacy scene also loads its WebGL dependencies. The Worker
// presentation never requests it. Cancellation is checked before constructing
// an owner because a dynamic import itself cannot be aborted.
export async function loadLegacyWorldScene({isCurrent,load=()=>import('../rendering/scene.js')}={}){
 if(typeof isCurrent!=='function'||typeof load!=='function')throw TypeError('Invalid legacy scene request');
 let module;try{module=await load();}catch(error){if(!isCurrent())throw new DOMException('Loading cancelled','AbortError');throw error;}
 if(!isCurrent())throw new DOMException('Loading cancelled','AbortError');
 if(typeof module?.WorldScene!=='function')throw TypeError('Invalid legacy scene module');
 return module.WorldScene;
}

// The loading diorama is also a WebGL presentation and is unnecessary for
// the Worker-owned loading path. Keep cancellation at the import boundary.
export async function loadLegacyLoadingDiorama({isCurrent,load=()=>import('../rendering/loading-diorama.js')}={}){
 if(typeof isCurrent!=='function'||typeof load!=='function')throw TypeError('Invalid loading diorama request');
 let module;try{module=await load();}catch(error){if(!isCurrent())throw new DOMException('Loading cancelled','AbortError');throw error;}
 if(!isCurrent())throw new DOMException('Loading cancelled','AbortError');
 if(typeof module?.LoadingDiorama!=='function')throw TypeError('Invalid loading diorama module');
 return module.LoadingDiorama;
}

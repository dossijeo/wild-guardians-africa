import {shadow} from 'three/tsl';

// The temporal profile shares Three's actual ShadowNode with both explicit
// TSL materials and AnalyticLightNode via Three's light-shadow hook. The
// renderer owns node/target disposal; this lease only owns the hook itself.
export function createWebGpuSharedShadow(light,{onInvalidated=()=>{}}={}){
 if(!light?.isDirectionalLight||!light.shadow||!light.castShadow||light.shadow.shadowNode!==undefined||typeof onInvalidated!=='function')throw TypeError('Invalid shared shadow light');
 const node=shadow(light);light.shadow.shadowNode=node;let active=true,disposed=false;
 const invalidated=()=>{disposed=true;if(light.shadow.shadowNode===node)delete light.shadow.shadowNode;try{onInvalidated();}catch{}};node.addEventListener('dispose',invalidated);
 return {node,valid(){return active&&!disposed&&light.castShadow&&light.shadow.shadowNode===node;},release(){if(!active)return;active=false;node.removeEventListener('dispose',invalidated);if(light.shadow.shadowNode===node)delete light.shadow.shadowNode;}};
}

// A selection is tentative until the ordered authority answers. A newer pick,
// tool change or closed world makes an earlier response unobservable.
export function requestWorkerBlessingPreview({runtime,tool,targetId,isCurrent,onAccepted}){
 if(typeof runtime?.submit!=='function'||!tool||typeof targetId!=='string'||!targetId||typeof isCurrent!=='function'||typeof onAccepted!=='function')return Promise.reject(TypeError('Invalid blessing preview request'));
 const generation=tool.previewGeneration=(tool.previewGeneration??0)+1;
 return runtime.submit({kind:'previewBlessing',targetId}).then(result=>{if(!isCurrent()||tool.previewGeneration!==generation)return false;const draft=result?.value;if(!draft||draft.targetId!==targetId||typeof draft.valid!=='boolean'||draft.valid&&!['plant','wall'].includes(draft.kind)||!draft.valid&&typeof draft.reason!=='string')throw Error('Invalid blessing preview response');onAccepted(draft);return true;},error=>{if(!isCurrent()||tool.previewGeneration!==generation)return false;throw error;});
}

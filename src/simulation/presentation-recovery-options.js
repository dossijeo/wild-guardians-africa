// The explicit contract is independent of the renderer and its QA controls.
// A detached consumer may continue only when both concurrent replay and work
// effect checkpoints are available; no configuration silently enables it.
export function resolvePresentationRecoveryOptions(options={}, {allowQa=true}={}){
 if(!options||typeof options!=='object'||Array.isArray(options))throw TypeError('Invalid recovery options');
 const configured=options.visualRecovery;
 if(configured!==undefined&&(!configured||typeof configured!=='object'||Array.isArray(configured)))throw TypeError('Invalid visual recovery configuration');
 const allowed=new Set(['enabled','concurrent','work','backpressure','compactTicks']);
 if(configured&&Object.keys(configured).some(key=>!allowed.has(key)))throw TypeError('Unknown visual recovery option');
 if(configured&&Object.values(configured).some(value=>typeof value!=='boolean'))throw TypeError('Invalid visual recovery option');
 const qa=allowQa&&options.qaVisualRecovery===true;
 if(configured&&qa)throw TypeError('Conflicting visual recovery configurations');
 const enabled=configured?configured.enabled===true:qa;
 const result={enabled,concurrent:configured?configured.concurrent===true:allowQa&&options.qaVisualRecoveryConcurrent===true,work:configured?configured.work===true:allowQa&&options.qaVisualWorkRecovery===true,backpressure:configured?configured.backpressure===true:allowQa&&options.qaVisualBackpressureRecovery===true,compactTicks:configured?configured.compactTicks===true:allowQa&&options.qaVisualRecoveryCompact===true};
 if(!enabled&&(result.concurrent||result.work||result.backpressure||result.compactTicks)||result.backpressure&&(!result.concurrent||!result.work))throw TypeError('Invalid visual recovery configuration');
 return Object.freeze(result);
}

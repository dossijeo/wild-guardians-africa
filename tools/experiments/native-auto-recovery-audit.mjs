// QA-only fault injection at the production Worker failure boundary. Recovery,
// source journal, ports and GPU owners remain the ordinary application's own.
export function rewriteAutoRecoveryAudit(kind,source){
 const replace=(anchor,value)=>{if(source.split(anchor).length!==2)throw Error('Auto recovery audit anchor missing or ambiguous: '+kind);source=source.replace(anchor,value);};
 if(kind==='worker')source+=`\nglobalThis.__auditInvalidateFrame=()=>{if(phase!=='running'||!surface||!remoteGpu)throw Error('Original running GPU owner required');fail(Object.assign(Error('QA injected obsolete frame failure'),{code:'remote-frame-native-mutation-obsolete'}));};\n`;
 else if(kind==='main'){
  replace('owner.webGpuRecovery=async()=>{','owner.webGpuRecovery=async()=>{(globalThis.__autoRecoveryAttempts??=[]).push({at:performance.now()});');
  replace('return {base:checkpoint.sequence,sequence:attached.sequence,retained};','const result={base:checkpoint.sequence,sequence:attached.sequence,retained};(globalThis.__autoRecoveryResults??=[]).push(result);return result;');
  replace('markLost:()=>runtime.markVisualLost(),',"markLost:()=>{(globalThis.__autoRecoveryMarks??=[]).push(performance.now());return runtime.markVisualLost();},");
 }else throw Error('Unknown automatic recovery audit module');
 return source;
}

export async function triggerAutomaticRecovery(page,index){
 const workers=page.workers().filter(w=>w.url().includes('native-worker-world-audit-worker.js'));
 if(workers.length!==1)throw Error('Exactly one original WorldWorker required');
 await workers[0].evaluate(()=>globalThis.__auditInvalidateFrame());
 await page.waitForFunction(index=>globalThis.__autoRecoveryResults?.length===index,index,{timeout:60000});
 return page.evaluate(index=>{
  if(globalThis.__autoRecoveryAttempts?.length!==index||globalThis.__autoRecoveryMarks?.length!==index)throw Error('Automatic failure did not traverse exactly one source mark and recovery');
  return globalThis.__autoRecoveryResults[index-1];
 },index);
}

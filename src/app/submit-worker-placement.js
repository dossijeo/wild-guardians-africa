// The preview message is posted before this request on the same Worker port.
// Wait for the main-thread projection as well as the visual receipt so callers
// can safely inspect confirmed state and request a save.
export function submitWorkerPlacement(owner,command){
 const runtime=owner?.workerRuntime;
 if(!runtime||typeof runtime.submit!=='function')return Promise.reject(Error('Worker authority unavailable'));
 if(!owner.workerGpuOnly||owner.presentationInputs!==true)return runtime.submit(command);
 const client=owner.webGpuWorld?.client;
 if(!client||typeof client.submitPresentationInput!=='function'||typeof runtime.waitForConfirmed!=='function')return Promise.reject(Error('Causal placement unavailable'));
 const sequence=owner.qaPresentationInputSeq=(owner.qaPresentationInputSeq??0)+1;
 return client.submitPresentationInput(sequence,command).then(async result=>{await runtime.waitForConfirmed(result.sequence);return result;});
}

// For visual actions, the caller posts its preview first on the same port.
// Wait for the main projection as well as the visual receipt before callers
// inspect confirmed state or request a save.
export function submitWorkerInput(owner,command){
 const runtime=owner?.workerRuntime;
 if(!runtime||typeof runtime.submit!=='function')return Promise.reject(Error('Worker authority unavailable'));
 if(!owner.workerGpuOnly||owner.presentationInputs!==true)return runtime.submit(command);
 const client=owner.webGpuWorld?.client;
 if(!client||typeof client.submitPresentationInput!=='function'||typeof runtime.waitForConfirmed!=='function')return Promise.reject(Error('Causal input unavailable'));
 const sequence=owner.qaPresentationInputSeq=(owner.qaPresentationInputSeq??0)+1;
 return client.submitPresentationInput(sequence,command).then(async result=>{await runtime.waitForConfirmed(result.sequence);return result;});
}

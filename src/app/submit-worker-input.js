const pendingByOwner=new WeakMap();

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
 let submitted;try{submitted=client.submitPresentationInput(sequence,command);}catch(error){return Promise.reject(error);}
 const request=Promise.resolve(submitted).then(async result=>{await runtime.waitForConfirmed(result.sequence);return result;});
 let pending=pendingByOwner.get(owner);if(!pending){pending=new Set();pendingByOwner.set(owner,pending);}pending.add(request);const remove=()=>{pending.delete(request);if(!pending.size&&pendingByOwner.get(owner)===pending)pendingByOwner.delete(owner);};request.then(remove,remove);return request;
}

// Capture only work submitted before this checkpoint request. Failed inputs
// also settle the fence; the authority snapshot remains the source of truth.
export function waitForWorkerInputs(owner){const pending=pendingByOwner.get(owner);return pending?.size?Promise.allSettled([...pending]).then(()=>{}):Promise.resolve();}

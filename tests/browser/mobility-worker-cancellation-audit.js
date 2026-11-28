const worker=new Worker(new URL('./mobility-worker-cancellation.js',import.meta.url),{type:'module'}),jobs=new Map();let next=0;
const ready=new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>{const row=e.data;if(row.kind==='ready')return resolve();const job=jobs.get(row.id);if(!job){if(row.kind==='error')reject(Error(row.error));return;}if(row.kind==='error'){jobs.delete(row.id);job.reject(Error(row.error));}else if(row.kind==='started'){job.startedAt=row.at-performance.timeOrigin;job.onStart();}else if(row.kind==='cancel-result'){job.cancelAccepted=row.accepted;job.cancelHandledAt=row.at-performance.timeOrigin;job.onCancel();}else if(row.kind==='done'){job.done=row;job.doneAt=row.at-performance.timeOrigin;job.onDone();}};});
try{
 await ready;
 window.runCancellationAudit=async(mode,cancel)=>{
  if(!['single','cooperative','channel'].includes(mode))throw Error('Invalid mode');
  const id=++next,job={id,mode,cancel,requestedAt:performance.now()};jobs.set(id,job);
  const started=new Promise(resolve=>job.onStart=resolve),done=new Promise((resolve,reject)=>{job.onDone=resolve;job.reject=reject;}),cancelled=cancel?new Promise(resolve=>job.onCancel=resolve):null;
  worker.postMessage({kind:'run',id,mode,count:700,quantum:40});await started;
  if(cancel){await new Promise(resolve=>setTimeout(resolve,10));job.invalidatedAt=performance.now();worker.postMessage({kind:'cancel',id});}
  await done;if(cancel)await cancelled;jobs.delete(id);
  const result={mode,cancel,elapsedMs:job.doneAt-job.requestedAt,startedDelayMs:job.startedAt-job.requestedAt,status:job.done.status,queries:job.done.queries,hash:job.done.hash??null,...(cancel?{invalidationToCancelHandledMs:job.cancelHandledAt-job.invalidatedAt,cancelAccepted:job.cancelAccepted,completedAfterInvalidation:job.done.status==='completed'&&job.doneAt>=job.invalidatedAt}:{})};
  if(!cancel&&(result.status!=='completed'||result.queries!==700))throw Error('Work incomplete');
  if(cancel&&mode!=='single'&&(!result.cancelAccepted||result.status!=='cancelled'||result.queries>=700))throw Error('Cooperative cancellation failed');
  return result;
 };
 window.cancellationReady=true;document.querySelector('#status').textContent='Preparado';
}catch(error){window.cancellationError=String(error?.stack??error);document.querySelector('#status').textContent=window.cancellationError;}

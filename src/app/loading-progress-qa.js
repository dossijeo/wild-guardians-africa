import {LoadingGpuQa} from './loading-gpu-qa.js';
// Opt-in DOM evidence for the application path; no extra loop or HTTP request.
export function installLoadingProgressQa(doc=document,{throttleReady=true,gpu=false,gpuFactory=renderer=>new LoadingGpuQa(renderer),now=()=>performance.now()}={}){
 const element=doc.createElement('script');element.type='application/json';element.id='loading-progress-qa';doc.head.append(element);
 let gpuOwner=null;
 let previous=0,previousFrame=null,wasReady=false,report={samples:[],frames:[]};
 const publish=()=>{const start=now();element.textContent=JSON.stringify(report);const end=now();(report.loadingSpans??=[]).push({label:'qa-dom-serialize',start,end,duration:end-start,failed:false,scope:'Diagnostic JSON serialization and DOM text write CPU; final export write is not self-recorded.'});};
 return {
  begin(now,renderer){previousFrame=now;if(gpu&&renderer){gpuOwner?.close();gpuOwner=gpuFactory(renderer);}},
  frame(now){if(previousFrame!==null)report.frames.push({at:now,interval:now-previousFrame});previousFrame=now;},
  preparationPolicy(isolated,zeroVertices=false){report.preparationPolicy={farIsolatedPreparation:isolated===true,farZeroVertexPreparation:zeroVertices===true,scope:'World owner policy at loading start; GPU draw metadata/readbacks provide actual execution evidence.'};},
  actorQueue(stats){report.actorQueue=stats;},
  cameraPose(phase,world,{basis='Loaded world focusFarm/Home pose; save data does not persist free-camera pose.'}={}){if(!world?.camera||!world.controls?.target)return;(report.cameraPoses??=[]).push({phase,at:now(),basis,scope:'Read-only camera values at the labeled loading continuation; completion is after cinematic restore, before controls enable and final HUD/world draw. Not a framebuffer/presentation measurement.',eye:world.camera.position.toArray(),quaternion:world.camera.quaternion.toArray(),target:world.controls.target.toArray(),cinematic:world.cinematic===true,controlsEnabled:world.controls.enabled===true,disposed:world.disposed===true});},
  lifecycle(label){const at=now();(report.loadingSpans??=[]).push({label,start:at,end:at,duration:0,scope:'Parent application lifecycle receipt marker, not the originating iframe click timestamp or exclusive CPU.'});},
  loadingSpan(span){(report.loadingSpans??=[]).push(span);},
  invocation(label,run){const start=now();let failed=false;try{return gpuOwner&&(label==='presentation-diorama-render'||label==='presentation-cinematic-step')?gpuOwner.measure(label,run):run();}catch(error){failed=true;throw error;}finally{const end=now();(report.loadingSpans??=[]).push({label,start,end,duration:end-start,failed,scope:'Synchronous presentation CPU wall time; includes nested witnesses, no awaited/GPU work.'});}},
  gpuInvocation(label,run){return gpuOwner?gpuOwner.measure(label,run):run();},
  snapshotDecode(diagnostic){(report.snapshotDecode??=[]).push({...diagnostic,at:now()});publish();},
  update(progress){if(!progress)return;const at=now(),becameReady=progress.ready&&!wasReady;wasReady=progress.ready;if(at-previous<250&&!progress.failure&&!becameReady&&(throttleReady||!progress.ready))return;previous=at;const snapshot=progress.snapshot();report.samples.push({at,progress:snapshot.progress,ready:snapshot.ready,pending:snapshot.pending,downloads:snapshot.downloads});if(report.samples.length>256)report.samples.shift();report.current=snapshot;publish();},
  close(progress,owner,{cancelled=false}={}){if(!owner&&!progress)return;if(gpuOwner){report.gpu=gpuOwner.close();gpuOwner=null;}report.current=progress?.snapshot()??null;report.downloads=owner?.downloads.snapshot({details:true})??null;report.closed=true;report.cancelled=cancelled;report.frameScope='Existing application RAF intervals while the loading presentation is active. Collection ends before the final HUD draw; not GPU timer or presented-frame measurements.';publish();report={samples:[],frames:[]};previous=0;previousFrame=null;wasReady=false;}
 };
}

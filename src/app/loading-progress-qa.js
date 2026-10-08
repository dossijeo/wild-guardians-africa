// Opt-in DOM evidence for the application path; no extra loop or HTTP request.
export function installLoadingProgressQa(doc=document){
 const element=doc.createElement('script');element.type='application/json';element.id='loading-progress-qa';doc.head.append(element);
 let previous=0,previousFrame=null,report={samples:[],frames:[]};
 return {
  begin(now){previousFrame=now;},
  frame(now){if(previousFrame!==null)report.frames.push({at:now,interval:now-previousFrame});previousFrame=now;},
  snapshotDecode(diagnostic){(report.snapshotDecode??=[]).push({...diagnostic,at:performance.now()});element.textContent=JSON.stringify(report);},
  update(progress){if(!progress)return;const now=performance.now();if(now-previous<250&&!progress.ready&&!progress.failure)return;previous=now;const snapshot=progress.snapshot();report.samples.push({at:now,progress:snapshot.progress,ready:snapshot.ready,pending:snapshot.pending,downloads:snapshot.downloads});if(report.samples.length>256)report.samples.shift();report.current=snapshot;element.textContent=JSON.stringify(report);},
  close(progress,owner,{cancelled=false}={}){if(!owner&&!progress)return;report.current=progress?.snapshot()??null;report.downloads=owner?.downloads.snapshot({details:true})??null;report.closed=true;report.cancelled=cancelled;report.frameScope='Existing application RAF intervals while the loading presentation is active. Collection ends before the final HUD draw; not GPU timer or presented-frame measurements.';element.textContent=JSON.stringify(report);report={samples:[],frames:[]};previous=0;previousFrame=null;}
 };
}

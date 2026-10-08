// Opt-in DOM evidence for the application path; no extra loop or HTTP request.
export function installLoadingProgressQa(doc=document){
 const element=doc.createElement('script');element.type='application/json';element.id='loading-progress-qa';doc.head.append(element);
 let previous=0,report={samples:[]};
 return {
  update(progress){if(!progress)return;const now=performance.now();if(now-previous<250&&!progress.ready&&!progress.failure)return;previous=now;const snapshot=progress.snapshot();report.samples.push({at:now,progress:snapshot.progress,ready:snapshot.ready,pending:snapshot.pending,downloads:snapshot.downloads});if(report.samples.length>256)report.samples.shift();report.current=snapshot;element.textContent=JSON.stringify(report);},
  close(progress,owner,{cancelled=false}={}){if(!owner&&!cancelled)return;report.current=progress?.snapshot()??null;report.downloads=owner?.downloads.snapshot({details:true})??null;report.closed=true;report.cancelled=cancelled;element.textContent=JSON.stringify(report);report={samples:[]};previous=0;}
 };
}

// Estimated work completion is intentionally separate from verified readiness.
// Weights are supplied by the measured loading recipe, not animation timers.
export class LoadingProgress {
  // Default16s is a rounded median exclusive-wait proxy from30 native worlds;
  // it is a scheduling estimate, not a sum of network-inclusive stage durations.
  constructor(stages,{now=()=>performance.now(),onChange=()=>{},downloads=null,workEstimateMs=16000}={}) {
    if(!stages.length||stages.some(s=>!s.id||!(s.weight>0))||new Set(stages.map(s=>s.id)).size!==stages.length)throw Error('Invalid loading stages');
    if(!(workEstimateMs>0))throw Error('Invalid loading work estimate');
    this.now=now;this.onChange=onChange;this.downloads=downloads;this.workEstimateMs=workEstimateMs;this.stages=new Map(stages.map(s=>[s.id,{...s,progress:0,started:null,finished:null}]));
    this.total=stages.reduce((n,s)=>n+s.weight,0);this.value=0;this.ready=false;this.failure=null;this.started=now();this.changed=this.started;
  }
  update(id,completed=1,total=1) {
    if(this.failure||this.ready)return this.snapshot();
    const stage=this.stages.get(id);if(!stage)throw Error('Unknown loading milestone: '+id);
    if(!Number.isFinite(completed)||!Number.isFinite(total)||total<=0)throw Error('Invalid work progress');
    stage.started??=this.now();const next=Math.max(stage.progress,Math.min(1,Math.max(0,completed/total)));
    if(next!==stage.progress){stage.progress=next;this.changed=this.now();}
    if(next===1)stage.finished??=this.now();
    this.refresh();
    const snapshot=this.snapshot();this.onChange(snapshot);return snapshot;
  }
  confirmReady() {
    if(this.failure)throw this.failure;
    if([...this.stages.values()].some(s=>s.progress!==1))throw Error('Loading readiness requires every milestone');
    if(this.downloads?.snapshot().pending)throw Error('Loading readiness requires every asset transfer');
    this.ready=true;this.value=1;this.changed=this.now();const snapshot=this.snapshot();this.onChange(snapshot);return snapshot;
  }
  fail(error) {if(this.ready)return;this.failure=error instanceof Error?error:new Error(String(error));this.onChange(this.snapshot());}
  refresh(){
    if(this.ready||this.failure)return this.value;
    const work=[...this.stages.values()].reduce((n,s)=>n+s.progress*s.weight,0)/this.total,downloads=this.downloads?.snapshot(),time=downloads?.estimatedMs??0;
    const next=Math.max(this.value,Math.min(.99,(work*this.workEstimateMs+(downloads?.progress??1)*time)/(this.workEstimateMs+time)));
    if(next!==this.value)this.changed=this.now();this.value=next;return next;
  }
  snapshot(){return {progress:this.value,ready:this.ready,estimated:!this.ready,error:this.failure?.message??null,elapsed:this.now()-this.started,unchangedFor:this.now()-this.changed,pending:[...this.stages.values()].filter(s=>s.progress<1).map(s=>s.id),stages:[...this.stages.values()].map(s=>({...s})),...(this.downloads?{downloads:this.downloads.snapshot(),workEstimateMs:this.workEstimateMs}:{})};}
}

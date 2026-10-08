// Estimated work completion is intentionally separate from verified readiness.
// Weights are supplied by the measured loading recipe, not animation timers.
export class LoadingProgress {
  constructor(stages,{now=()=>performance.now(),onChange=()=>{}}={}) {
    if(!stages.length||stages.some(s=>!s.id||!(s.weight>0))||new Set(stages.map(s=>s.id)).size!==stages.length)throw Error('Invalid loading stages');
    this.now=now;this.onChange=onChange;this.stages=new Map(stages.map(s=>[s.id,{...s,progress:0,started:null,finished:null}]));
    this.total=stages.reduce((n,s)=>n+s.weight,0);this.value=0;this.ready=false;this.failure=null;this.started=now();this.changed=this.started;
  }
  update(id,completed=1,total=1) {
    if(this.failure||this.ready)return this.snapshot();
    const stage=this.stages.get(id);if(!stage)throw Error('Unknown loading milestone: '+id);
    if(!Number.isFinite(completed)||!Number.isFinite(total)||total<=0)throw Error('Invalid work progress');
    stage.started??=this.now();const next=Math.max(stage.progress,Math.min(1,Math.max(0,completed/total)));
    if(next!==stage.progress){stage.progress=next;this.changed=this.now();}
    if(next===1)stage.finished??=this.now();
    this.value=Math.max(this.value,Math.min(.99,[...this.stages.values()].reduce((n,s)=>n+s.progress*s.weight,0)/this.total));
    const snapshot=this.snapshot();this.onChange(snapshot);return snapshot;
  }
  confirmReady() {
    if(this.failure)throw this.failure;
    if([...this.stages.values()].some(s=>s.progress!==1))throw Error('Loading readiness requires every milestone');
    this.ready=true;this.value=1;this.changed=this.now();const snapshot=this.snapshot();this.onChange(snapshot);return snapshot;
  }
  fail(error) {if(this.ready)return;this.failure=error instanceof Error?error:new Error(String(error));this.onChange(this.snapshot());}
  snapshot(){return {progress:this.value,ready:this.ready,estimated:!this.ready,error:this.failure?.message??null,elapsed:this.now()-this.started,unchangedFor:this.now()-this.changed,pending:[...this.stages.values()].filter(s=>s.progress<1).map(s=>s.id),stages:[...this.stages.values()].map(s=>({...s}))};}
}

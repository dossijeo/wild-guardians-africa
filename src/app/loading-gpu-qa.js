import {GpuTimer} from '../../tests/browser/gpu-timer.js';
// Explicit application QA only. The envelope measures commands enqueued by the
// synchronous presentation call, including subdraws; async uploads outside it
// are excluded. Query polling itself may alter CPU/driver pacing.
export class LoadingGpuQa {
 constructor(renderer,{timerFactory=gl=>new GpuTimer(gl,64),now=()=>performance.now()}={}){this.timer=timerFactory(renderer.getContext());this.now=now;this.labels=[];this.index=0;this.active=false;this.closed=false;}
 measure(label,run){if(this.closed||this.active)return run();const frame=this.index++,at=this.now(),timed=this.timer.begin(frame);this.active=true;try{return run();}finally{this.active=false;if(timed)this.timer.end();this.labels.push({frame,label,at,timed});}}
 close(){if(this.closed)return this.result;this.closed=true;this.timer.poll();const pendingBeforeDispose=this.timer.report().pending;this.timer.dispose();this.result={...this.timer.report(),pendingBeforeDispose,labels:this.labels,scope:'GPU elapsed query over synchronous presentation commands including subdraws; excludes async uploads/preparation outside the envelope. Polling overhead means RAF is diagnostic, not an uninstrumented performance comparison.'};return this.result;}
}

import {GpuTimer} from '../../tests/browser/gpu-timer.js';
// Explicit application QA only. The envelope measures commands enqueued by the
// synchronous presentation call, including subdraws; async uploads outside it
// are excluded. Query polling itself may alter CPU/driver pacing.
export class LoadingGpuQa {
 constructor(renderer,{timerFactory=gl=>new GpuTimer(gl,64),now=()=>performance.now()}={}){this.renderer=renderer;this.timer=timerFactory(renderer.getContext());this.now=now;this.labels=[];this.index=0;this.active=false;this.closed=false;this.nestedSkipped=0;}
 measure(label,run){if(this.closed)return run();if(this.active){this.nestedSkipped++;return run();}const frame=this.index++,at=this.now(),timed=this.timer.begin(frame);this.active=true;try{return run();}finally{this.active=false;if(timed)this.timer.end();const render=this.renderer.info?.render;this.labels.push({frame,label,at,timed,...(render?{lastRender:{calls:render.calls,triangles:render.triangles,points:render.points,lines:render.lines,frame:render.frame}}:{})});}}
 close(){if(this.closed)return this.result;this.closed=true;this.timer.poll();const pendingBeforeDispose=this.timer.report().pending;this.timer.dispose();this.result={...this.timer.report(),pendingBeforeDispose,nestedSkipped:this.nestedSkipped,labels:this.labels,scope:'GPU elapsed query over synchronous presentation commands including subdraws; excludes async uploads/preparation outside the envelope. Polling overhead means RAF is diagnostic, not an uninstrumented performance comparison. lastRender is renderer.info after the call; autoReset may restrict it to the final subpass, not the entire query.'};return this.result;}
}

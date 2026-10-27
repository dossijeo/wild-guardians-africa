import {GpuTimer} from './gpu-timer.js';
const MODES=['none','body','effects','all'];
const modeAt=i=>MODES[(i+Math.floor(i/4))%4];
const percentile=(values,p)=>{if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];};
// Interleave identical frozen world/pose frames. GPU queries are asynchronous;
// the instrumented RAF is intentionally not reported as game FPS.
export class GuardianGpuPairs{
 constructor(renderer,setMode,done,{age=.12}={}){this.age=age;this.renderer=renderer;this.timer=new GpuTimer(renderer.getContext(),32);this.setMode=setMode;this.done=done;this.index=0;this.cpu=[];this.draining=0;}
 frame(render){
  const i=this.index++,mode=modeAt(i);
  if(i<280){this.setMode(mode);const started=performance.now(),timed=i>=40&&this.timer.begin(i);try{render();}finally{if(timed)this.timer.end();if(i>=40)this.cpu.push({frame:i,mode,ms:performance.now()-started,draws:this.renderer.info.render.calls});}}
  else{this.timer.poll();render();if(!this.timer.pending.length||this.draining++>60)this.finish();}
 }
 finish(){const raw=this.timer.report();this.timer.dispose();this.setMode('all');const modes=MODES.map(mode=>{const rows=this.cpu.filter(r=>r.mode===mode),gpu=raw.samples.filter(s=>modeAt(s.frame)===mode).map(s=>s.ms);return {mode,cpuSamples:rows.length,gpuSamples:gpu.length,cpuP50:percentile(rows.map(r=>r.ms),.5),cpuP95:percentile(rows.map(r=>r.ms),.95),gpuP50:percentile(gpu,.5),gpuP95:percentile(gpu,.95),drawP95:percentile(rows.map(r=>r.draws),.95)};});this.done({scope:'Latin-square order, interleaved frozen identical world; 40 warmup + 240 timed frames; GPU elapsed queries, not RAF FPS',age:this.age,modes,timer:raw});}
 dispose(){this.timer.dispose();}
}

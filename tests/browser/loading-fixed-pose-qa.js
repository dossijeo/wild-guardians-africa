import {LoadingGpuQa} from '../../src/app/loading-gpu-qa.js';

// Standalone QA only: called by the fixture's existing RAF, after loading has
// closed. Both recipes submit World.render(0) at the actual final camera pose.
// This does not reproduce a moving cinematic or measure loading duration.
export class LoadingFixedPoseQa {
 constructor(world,{samples=120,warmup=30,stableFrames=12,timeout=120000,now=()=>performance.now(),gpuFactory=renderer=>new LoadingGpuQa(renderer),onClose=()=>{}}={}){
  Object.assign(this,{world,samples,warmup,stableFrames,timeout,now,onClose});
  this.started=now();this.originalCinematic=world.cinematic;this.originalEnabled=world.controls.enabled;world.controls.enabled=false;
  this.pose=[...world.camera.position.toArray(),...world.camera.quaternion.toArray(),...world.controls.target.toArray()];
  this.clock=[world.state.day,world.state.time,world.state.elapsed];
  this.owner=gpuFactory(world.renderer);this.arms=['A1','B1','B2','A2'];this.arm=0;this.count=0;this.stable=0;this.frames=[];this.closed=false;
  this.report={scope:'Fixed final camera; ordinary World.render(0) versus cinematic World.render(0), ABBA. No moving-camera/loading-duration claim. GPU queries cover synchronous submitted subdraws, not asynchronous preparation. RAF includes timer polling and diagnostic checks. Both recipes retain quality and simulation.',frames:this.frames,contamination:[],poseMismatch:[],clockMismatch:[],errors:[],pose:this.pose,clock:this.clock};
  this.lost=()=>this.close('context-lost');world.renderer.domElement?.addEventListener('webglcontextlost',this.lost);
 }
 pending(){return (this.world.farVegetation?.adapters??[]).map(adapter=>({pending:adapter.preparationPending(),status:adapter.preparationStatus()}));}
 frame(at){
  if(this.closed)return;
  const {world}=this;
  try{
   if(world.disposed||world.renderer.getContext().isContextLost())return this.close('world-ended');
   if(this.now()-this.started>this.timeout)return this.close('deadline');
   const errors=(world.farVegetation?.adapters??[]).flatMap(adapter=>adapter.stats?.errors??[]);if(errors.length)throw Error('Far preparation failed: '+errors[0]);
   const label=this.arms[this.arm],waiting=this.stable<this.stableFrames,measured=!waiting&&this.count>=this.warmup;
   const interval=this.frames.length?at-this.frames.at(-1).at:null,before=this.pending(),start=this.now();
   // The camera is never overridden to make a mismatch pass. Ordinary camera
   // constraints must preserve this already valid final pose themselves.
   world.cinematic=!waiting&&label.startsWith('B');
   if(measured)this.owner.measure('fixed-pose-'+label,()=>world.render(0));else world.render(0);
   const after=this.pending(),pending=before.some(x=>x.pending)||after.some(x=>x.pending);
   const pose=[...world.camera.position.toArray(),...world.camera.quaternion.toArray(),...world.controls.target.toArray()],clock=[world.state.day,world.state.time,world.state.elapsed];
   const frame={at,interval,label:waiting?'settling':label,measured,cpuMs:this.now()-start,pending};this.frames.push(frame);
   if(pose.some((value,i)=>Math.abs(value-this.pose[i])>1e-8))this.report.poseMismatch.push({frame:this.frames.length-1,pose});
   if(clock.some((value,i)=>value!==this.clock[i]))this.report.clockMismatch.push({frame:this.frames.length-1,clock});
   if(waiting){this.stable=pending?0:this.stable+1;return;}
   if(pending)this.report.contamination.push({frame:this.frames.length-1,before,after});
   this.count++;if(this.count>=this.warmup+this.samples){this.arm++;this.count=0;if(this.arm===this.arms.length)this.close('complete');}
  }catch(error){this.report.errors.push(String(error.stack??error));this.close('render-error');}
 }
 close(reason='cancelled'){
  if(this.closed)return this.report;this.closed=true;
  this.world.renderer.domElement?.removeEventListener('webglcontextlost',this.lost);
  this.world.cinematic=this.originalCinematic;this.world.controls.enabled=this.originalEnabled;
  this.report.gpu=this.owner.close();this.report.reason=reason;this.report.closed=true;this.report.elapsedMs=this.now()-this.started;
  this.report.workComparable=reason==='complete'&&!this.report.errors.length&&!this.report.contamination.length&&!this.report.poseMismatch.length&&!this.report.clockMismatch.length;
  this.onClose(this.report);return this.report;
 }
}

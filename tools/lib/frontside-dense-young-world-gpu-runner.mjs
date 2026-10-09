import {createGpuQueryRecorder} from './frontside-gpu-query-recorder.mjs';
import {sharedLeafGpuPlan,pairedArmSchedule,analysePairedGpu} from './frontside-paired-gpu-analysis.mjs';
import {installWorldYoungMaizeQaAdapter} from './frontside-world-young-maize-adapter.mjs';
import {worldCpuInputSignature} from './frontside-world-cpu-input-signature.mjs';

// Geometry is deliberately excluded by worldCpuInputSignature. Live instance
// inputs and native rig poses must remain identical within and across arms.
export function denseWorldInputsUnchanged(reference,current){return JSON.stringify(reference)===JSON.stringify(current);}

// Actual WorldScene draw, with no readback/resource probe or actor replacement.
// Caller creates and owns the context, locks state/camera, and exports all blocks.
export async function runDenseYoungWorldPairedGpu({world,payload,depthEnabled,scope,raf,status,logicalIdentity}){
 const gl=world.renderer.getContext(),blocks=[];let adapter=null,frame=0;
 const priorAutoReset=world.renderer.info.autoReset;world.renderer.info.autoReset=false;
 scope.defer('dense World renderer counters restore',()=>{world.renderer.info.autoReset=priorAutoReset;});
 scope.defer('dense World candidate adapter',()=>adapter?.dispose());
 const selected=enabled=>{adapter?.dispose();adapter=null;if(enabled)adapter=installWorldYoungMaizeQaAdapter(world,payload,{worldDepth:depthEnabled});world.destructionPass.materialArrayDepth=depthEnabled;world.releaseNativeShadow.cache.enabled=false;world.releaseNativeShadow.cache.invalidate();};
 const draw=()=>{scope.assertOpen();world.renderer.info.reset();world.render(0);};
 const lock=logicalIdentity();
 let invalidCollection=null,inputLock=null;
 collection:for(const {pair,order,arms} of pairedArmSchedule(0,3))for(const arm of arms){
  selected(arm===3);
  status('Warmup '+pair+' '+order+' arm'+arm);
  for(let i=0;i<sharedLeafGpuPlan.warmupFrames;i++){await raf();draw();}
  if(logicalIdentity()!==lock){invalidCollection='Native logical state/camera changed before timing; no reroll';break collection;}
  const inputsBefore=worldCpuInputSignature(world);
  if(inputLock===null)inputLock=inputsBefore;
  if(!denseWorldInputsUnchanged(inputLock,inputsBefore)){invalidCollection='Active CPU instances or rig poses differ between arms; no reroll';break collection;}
  const recorder=createGpuQueryRecorder(gl);scope.defer('dense query '+pair+'-'+arm,()=>recorder.dispose());
  if(!recorder.snapshot().supported)throw Error('EXT_disjoint_timer_query_webgl2 unavailable');
  for(let i=0;i<sharedLeafGpuPlan.samplesPerBlock;i++){
   await raf();scope.assertOpen();recorder.poll();const begun=recorder.begin(frame++);
   try{draw();}finally{if(begun)recorder.end();}
   status('Pair '+pair+' '+order+' arm'+arm+' '+(i+1)+'/'+sharedLeafGpuPlan.samplesPerBlock);
  }
  gl.flush();for(let i=0;i<240&&recorder.snapshot().pending;i++){await raf();scope.assertOpen();recorder.poll();}
  const gpu=recorder.snapshot();recorder.dispose();
  const inputsAfter=worldCpuInputSignature(world),inputsUnchanged=denseWorldInputsUnchanged(inputLock,inputsAfter)&&denseWorldInputsUnchanged(inputsBefore,inputsAfter);
  blocks.push({pair,order,arm,warmupFrames:sharedLeafGpuPlan.warmupFrames,gpu,logicalUnchanged:logicalIdentity()===lock,inputsUnchanged,inputsBefore,inputsAfter,submissions:{...world.renderer.info.render},rendererMemory:{...world.renderer.info.memory},programCount:world.renderer.info.programs.length,adapter:adapter?.snapshot()??null});
  if(!blocks.at(-1).logicalUnchanged||!inputsUnchanged||gpu.pending||gpu.disjointEvents||gpu.discarded||gpu.overflowSkipped||gpu.foreignQuerySkipped||gpu.allocationFailures||gpu.contextLost||gpu.samples.length!==sharedLeafGpuPlan.samplesPerBlock){invalidCollection='Incomplete/invalid or changed logical/CPU instance/rig workload; preserved without reroll';break collection;}
 }
 let analysis=null,analysisError=null;try{if(invalidCollection)throw Error(invalidCollection);analysis=analysePairedGpu(blocks);}catch(error){analysisError=String(error);}
 // Avoid a second adapter disposal through stale owned references after release.
 adapter?.dispose();adapter=null;
 return{blocks,invalidCollection,analysis,analysisError,plan:{...sharedLeafGpuPlan},scope:'Whole actual WorldScene.render(0): colour, native shadows, Sky and active VFX/depth. No resource/buffer readback probe.',limitations:['The synthetic dense crop copy is a declared QA workload, not a naturally achieved campaign.','Both arms retain the same workers, actor poses, state, matrices and camera.','GPU benefit of this graph must be measured; the mature maize and isolated crop results are not inherited.']};
}

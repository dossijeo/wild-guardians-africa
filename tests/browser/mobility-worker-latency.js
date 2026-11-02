import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GpuTimer} from './gpu-timer.js';
import {createWorkload} from './mobility-worker-workload.js';
import {createTrajectoryReceiver} from '../../tools/trees/prototype_mobility_contract.mjs';
import {createGuardedTrajectory} from '../../tools/trees/prototype_guarded_trajectory.mjs';
import {createPausePresentationGate} from '../../tools/trees/prototype_pause_presentation_gate.mjs';
import {createWorld} from './mobility-worker-world-change.js';

const status=document.querySelector('#status'),canvas=document.querySelector('#view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true});renderer.setPixelRatio(1);renderer.setSize(640,360,false);renderer.setClearColor(0x000000,0);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,640/360,.1,100);camera.position.set(3.5,2.7,8);camera.lookAt(0,1,0);scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,5,4);scene.add(light);
const clock={value:0},horizon={value:3.5};let compiled=0,workerError=null;
const worker=new Worker(new URL('./mobility-worker.js',import.meta.url),{type:'module'}),pending=new Map();
const ready=new Promise((resolve,reject)=>{worker.addEventListener('error',event=>{workerError=String(event.message);reject(Error(workerError));});worker.addEventListener('message',event=>{const row=event.data;if(row.kind==='ready')resolve();else if(row.kind==='error'){workerError=row.error;reject(Error(row.error));}else{const current=pending.get(row.id);if(!current)return;if(row.kind==='started')current.startedAt=row.startedEpoch-performance.timeOrigin;if(row.kind==='done'){Object.assign(current,{startedAt:row.startedEpoch-performance.timeOrigin,finishedAt:row.finishedEpoch-performance.timeOrigin,receivedAt:performance.now(),elapsed:row.elapsed,queries:row.queries,found:row.found,unknown:row.unknown});pending.delete(row.id);}}});});

function installVisual(model){
 model.traverse(object=>{
  if(!object.isMesh)return;object.frustumCulled=false;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   const before=material.onBeforeCompile?.bind(material),key=material.customProgramCacheKey?.bind(material);
   material.onBeforeCompile=shader=>{before?.(shader);shader.uniforms.uLabSimulationTime=clock;shader.uniforms.uLabHorizon=horizon;shader.vertexShader='uniform float uLabSimulationTime;\nuniform float uLabHorizon;\n'+shader.vertexShader;const marker='#include <project_vertex>';if(!shader.vertexShader.includes(marker))throw Error('Projection shader changed');shader.vertexShader=shader.vertexShader.replace(marker,`${marker}\nfloat labTime=clamp(uLabSimulationTime,0.0,uLabHorizon);\nvec4 labOffset=viewMatrix*vec4(labTime*0.4,0.0,0.0,0.0);\ngl_Position=projectionMatrix*(mvPosition+labOffset);`);compiled++;};
   material.customProgramCacheKey=()=>`${key?.()??''}|mobility-worker-lab`;material.needsUpdate=true;
  }
 });
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),factor=2.2/Math.max(size.x,size.y,size.z),center=box.getCenter(new THREE.Vector3());model.scale.setScalar(factor);model.position.set(-center.x*factor,-box.min.y*factor,-center.z*factor);scene.add(model);
}
function inspectPixels(time){
 const target=new THREE.WebGLRenderTarget(640,360,{depthBuffer:true}),pixels=new Uint8Array(640*360*4);clock.value=time;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,640,360,pixels);renderer.setRenderTarget(null);target.dispose();let count=0,sumX=0,sumY=0,hash=2166136261;
 for(let y=0;y<360;y++)for(let x=0;x<640;x++){const offset=(y*640+x)*4;for(let c=0;c<4;c++)hash=Math.imul(hash^pixels[offset+c],16777619)>>>0;if(pixels[offset+3]>0){count++;sumX+=x;sumY+=y;}}
 return {count,centerX:count?sumX/count:null,centerY:count?sumY/count:null,hash};
}
const percentile=(items,p)=>{const sorted=[...items].sort((a,b)=>a-b);return sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]:null;};
try{
 const [model,workload]=await Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/content/source/actors/warthog/expressive-candidate.glb'),createWorkload(),ready]).then(rows=>[rows[0],rows[1]]);
 installVisual(model.scene);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
 const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),device=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 const visual=[inspectPixels(0),inspectPixels(3.5),inspectPixels(5)];
 if(!compiled||visual.some(v=>!v.count)||Math.abs(visual[0].centerX-visual[1].centerX)<3||Math.abs(visual[1].centerX-visual[2].centerX)>.01)throw Error('GPU trajectory or horizon control did not render as expected');
 window.mobilityWorkerReady={device,compiled,visual,horizon:horizon.value,staticPose:true};status.textContent=JSON.stringify(window.mobilityWorkerReady,null,2);
 let nextId=1;
 // Single cold tick of the same restored simulation, with real model rendering.
 window.runColdTickRenderAudit=async mode=>{
  if(!['main','worker','main-idle','worker-idle'].includes(mode))throw Error('Invalid mode');
  const isMain=mode.startsWith('main'),idle=mode.endsWith('-idle');
  const {createSimulation}=await import('./mobility-worker-simulation-core.js');
  let sim,backend,result=null,failed=null,requestAt=null,completedAt=null;
  if(isMain)sim=await createSimulation({mangrove:true});
  else{
   backend=new Worker(new URL('./mobility-worker-cooperative.js',import.meta.url),{type:'module'});
   await new Promise((resolve,reject)=>{backend.onerror=e=>reject(Error(e.message));backend.onmessage=({data:d})=>{if(d.kind==='ready')resolve();else if(d.kind==='error')reject(Error(d.error));};});
   backend.onerror=e=>failed=e.message;
   backend.onmessage=({data:d})=>{if(d.kind==='advance-result'){result=d;completedAt=performance.now();}else if(d.kind==='error')failed=d.error;};
  }
  const frames=[],renderTimes=[],timer=new GpuTimer(gl,64);let start=null,previous=null,frame=0;
  try{
   await new Promise((resolve,reject)=>{const draw=now=>{try{
    if(failed)throw Error(failed);if(start===null)start=now;if(previous!==null)frames.push({start:previous,end:now,dt:now-previous});previous=now;
    if(requestAt===null&&now-start>=500){requestAt=performance.now();if(idle){completedAt=requestAt;result={timings:[null],state:{snapshot:null}};}else if(isMain){const tick=sim.advanceTick(.05);result={timings:[tick],state:sim.state()};completedAt=performance.now();}else backend.postMessage({session:'cooperative-test',sequence:1,request:1,action:'advance',steps:1,mode:'sync'});}
    clock.value=(now-start)/1000;renderTimes.push(performance.now());const timed=timer.begin(frame++);renderer.render(scene,camera);if(timed)timer.end();
    if(now-start>=3000&&result){resolve();return;}if(now-start>15000)throw Error('Cold tick timeout');requestAnimationFrame(draw);
   }catch(e){reject(e);}};requestAnimationFrame(draw);});
   for(let i=0;i<30&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}const gpu=timer.report();
   const summary=rows=>{const values=rows.map(r=>r.dt);return {count:values.length,p95:percentile(values,.95),p99:percentile(values,.99),max:values.length?Math.max(...values):null};};
   const gpuSummary=items=>({count:items.length,p50:percentile(items.map(x=>x.ms),.5),p95:percentile(items.map(x=>x.ms),.95),p99:percentile(items.map(x=>x.ms),.99)});
   const groups={before:gpu.samples.filter(s=>renderTimes[s.frame]<requestAt),during:gpu.samples.filter(s=>renderTimes[s.frame]>=requestAt&&renderTimes[s.frame]<=completedAt),after:gpu.samples.filter(s=>renderTimes[s.frame]>completedAt)};
   return {mode,device,frames:summary(frames),overlap:summary(frames.filter(r=>r.end>=requestAt&&r.start<=completedAt)),tickMs:result.timings[0],responseMs:completedAt-requestAt,snapshot:result.state.snapshot,gpu:{samples:gpu.samples.length,p95:percentile(gpu.samples.map(x=>x.ms),.95),p99:percentile(gpu.samples.map(x=>x.ms),.99),reason:gpu.reason,disjointEvents:gpu.disjointEvents,discarded:gpu.discarded,overflowSkipped:gpu.overflowSkipped,pending:gpu.pending,groups:Object.fromEntries(Object.entries(groups).map(([name,items])=>[name,gpuSummary(items)]))}};
  }finally{timer.dispose();sim?.dispose();backend?.terminate();}
 };
 window.runGpuPauseAudit=async()=>{
  const backend=new Worker(new URL('./mobility-worker-commands.js',import.meta.url),{type:'module'});let failure=null,readyResolve,startedResolve,pausedResolve;
  const readyPromise=new Promise(resolve=>readyResolve=resolve),startedPromise=new Promise(resolve=>startedResolve=resolve),pausedPromise=new Promise(resolve=>pausedResolve=resolve);
  const bounded=promise=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error(failure||'Worker timeout')),30000))]);
  backend.onerror=e=>{failure=e.message;};backend.onmessage=e=>{const d=e.data;if(d.kind==='ready')readyResolve(d);else if(d.kind==='started'&&d.request===1)startedResolve();else if(d.kind==='ack'&&d.request===2)pausedResolve(d);else if(d.kind==='error')failure=d.error;};
  try{
   const info=await bounded(readyPromise),base=info.initialElapsed-.5,gate=createPausePresentationGate(info.session,info.initialElapsed,{displayedTime:base});horizon.value=3.5;
   const initial=inspectPixels(0);gate.advance(base+.25);const before=inspectPixels(gate.snapshot().displayed-base);
   backend.postMessage({session:info.session,sequence:1,request:1,action:'advance',steps:1});await bounded(startedPromise);
   if(!gate.requestPause(2))throw Error('Pause request rejected');backend.postMessage({session:info.session,sequence:2,request:2,action:'pause'});
   const stopped=inspectPixels(gate.advance(info.initialElapsed)-base),ack=await bounded(pausedPromise);if(failure)throw Error(failure);
   if(!gate.confirmPause({session:info.session,sequence:2,paused:ack.state.pauses.includes('diagnostic'),time:ack.state.elapsed}))throw Error('Pause acknowledgement rejected');
   const after=inspectPixels(gate.advance(ack.state.elapsed)-base),state=gate.snapshot(),resumeAllowed=gate.requestResume(3);
   if(initial.hash===before.hash||before.hash!==stopped.hash||stopped.hash!==after.hash||!state.needsReconciliation||resumeAllowed)throw Error('GPU pause audit failed');
   return {initial,before,stopped,after,pauseState:state,resumeAllowed,scope:'Synthetic shader trajectory on one static-pose model; confirmed horizon and displayed history are supplied by test. Worker runs a separate restored simulation. Synchronous pixel reads, no performance, physics, collisions, visual reconciliation or gameplay integration.'};
  }finally{backend.terminate();horizon.value=3.5;}
 };
 window.runGuardedWorldStopAudit=async()=>{
  const world=await createWorld(),options={worker:false,species:'hyena'};let base=null;
  try{
   for(let z=-10;z<=10&&!base;z+=2)for(let x=-10;x<=10&&!base;x+=2){const p={x:world.village.x+x,z:world.village.z+z},end={x:p.x+1.4,z:p.z};if(!world.session.actorStepClear(p,end,options))continue;const id=world.session.core.addOrientedBarrier(p.x+2.6,p.z,1.2,1.2,0,0);const safe=id>0&&world.session.actorStepClear(p,{x:p.x+.4,z:p.z},options)&&!world.session.actorCanStand(end,options);if(id>0)world.session.core.removeBarrier(id);if(safe)base=p;}
   if(!base||!world.network)throw Error('No test path on island network');
   const gate=createGuardedTrajectory('guarded','animal',{worldVersion:1}),route={session:'guarded',actorId:'animal',version:1,worldVersion:1,kind:'trajectory',startTime:0,points:[{x:0,z:0},{x:1.4,z:0}],durations:[3.5],movementMode:'walk',animationState:'walk'};
   if(!gate.install(route,0).accepted)throw Error('Route rejected');gate.presented(1);horizon.value=3.5;
   const job={id:nextId++,duration:500,requestedAt:performance.now()};pending.set(job.id,job);worker.postMessage({kind:'work',id:job.id,duration:job.duration});
   const deadline=performance.now()+5000;while(!Number.isFinite(job.startedAt)){if(workerError||performance.now()>deadline)throw Error(workerError||'Worker did not start');await new Promise(requestAnimationFrame);}
   const before=inspectPixels(1),wallStart=performance.now(),barrier=world.session.core.addOrientedBarrier(base.x+2.6,base.z,1.2,1.2,0,0),stopPoint={x:base.x+.4,z:base.z},future={x:base.x+1.4,z:base.z};
   const stopSafe=world.session.actorStepClear(base,stopPoint,options),futureBlocked=!world.session.actorCanStand(future,options),barrierMs=performance.now()-wallStart;
   const decision=gate.invalidate({worldVersion:2,at:1,point:{x:.4,z:0},version:2},1);horizon.value=1;const appliedAt=performance.now(),stopped=inspectPixels(1),after=inspectPixels(2),stale=gate.install({...route,version:3},1);
   while(!Number.isFinite(job.receivedAt)){if(workerError||performance.now()>deadline)throw Error(workerError||'Worker did not finish');await new Promise(requestAnimationFrame);}
   if(!barrier||!stopSafe||!futureBlocked||!decision.accepted||stale.reason!=='world'||appliedAt>=job.finishedAt||before.hash!==stopped.hash||stopped.hash!==after.hash||gate.sample(2).x!==.4)throw Error('Guarded world stop failed');
   horizon.value=3.5;return {network:world.network,base,stopPoint,future,barrier,barrierMs,stopSafe,futureBlocked,decision,stale,before,stopped,after,workerElapsedMs:job.elapsed,stopToWorkerCompletionMs:job.finishedAt-appliedAt,scope:'Synthetic single actor trajectory with a real native barrier, point and short-segment tests; synthetic confirmed time and version. Not an authoritative gameplay collision or visual-safety proof.'};
  }finally{world.session.dispose();}
 };
 window.runColdProfileAudit=async mode=>{
  if(!['idle','worker'].includes(mode))throw Error('Invalid cold profile mode');
  const backend=new Worker(new URL('./mobility-worker-cold-profile.js',import.meta.url),{type:'module'});let failure=null,started=null,result=null,cancel=null,currentVersion=1,invalidatedAt=null;
  try{
   const info=await new Promise((resolve,reject)=>{backend.onerror=e=>{failure=e.message;reject(Error(failure));};backend.onmessage=e=>{const row=e.data;if(row.kind==='ready')resolve(row);else if(row.kind==='error'){failure=row.error;reject(Error(row.error));}else if(row.kind==='started'){started=row.at-performance.timeOrigin;setTimeout(()=>{currentVersion++;invalidatedAt=performance.now();backend.postMessage({kind:'cancel',id:1});},10);}else if(row.kind==='result')result={...row,finishedAt:row.at-performance.timeOrigin,receivedAt:performance.now(),accepted:row.version===currentVersion};else if(row.kind==='cancel-result')cancel={...row,handledAt:row.at-performance.timeOrigin};};});
   if(info.chunks!==9||!info.network)throw Error('Wrong world fixture');
   const frames=[],timer=new GpuTimer(gl,64);let start=null,last=null,frame=0,requestedAt=null;
   await new Promise((resolve,reject)=>{const draw=now=>{try{
    if(failure)throw Error(failure);if(start===null)start=now;if(last!==null)frames.push({start:last,end:now,dt:now-last});last=now;
    if(mode==='worker'&&requestedAt===null&&now-start>=500){requestedAt=performance.now();backend.postMessage({kind:'run',id:1,version:currentVersion});}
    clock.value=(now-start)/1000;const timed=timer.begin(frame++);renderer.render(scene,camera);if(timed)timer.end();
    if(now-start>=3000&&(mode==='idle'||result&&cancel)){resolve();return;}if(now-start>12000)throw Error('Cold profile timed out');requestAnimationFrame(draw);
   }catch(error){reject(error);}};requestAnimationFrame(draw);});
   for(let i=0;i<30&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}const gpu=timer.report();timer.dispose();
   const summary=rows=>{const x=rows.map(r=>r.dt);return {count:x.length,p95:percentile(x,.95),p99:percentile(x,.99),max:x.length?Math.max(...x):null};};
   if(mode==='worker'&&(!result||!cancel||invalidatedAt===null||result.accepted||cancel.accepted||result.finishedAt<=invalidatedAt))throw Error('Invalid stale-result audit');
   return {mode,device,frames:summary(frames),overlap:summary(mode==='worker'?frames.filter(row=>row.end>=started&&row.start<=result.finishedAt):[]),profile:result?{elapsedMs:result.elapsed,requestToResultMs:result.receivedAt-requestedAt,cancelHandledMs:cancel.handledAt-invalidatedAt,accepted:result.accepted,cancelAccepted:cancel.accepted,region:result.result}:null,gpu:{reason:gpu.reason,samples:gpu.samples.length,p95:percentile(gpu.samples.map(x=>x.ms),.95),p99:percentile(gpu.samples.map(x=>x.ms),.99)},scope:'One real cold native navigation-profile build in an isolated Worker, synthetic mangrove island network and synthetic version invalidation. Static animal pose, no gameplay state or safety guarantee.'};
  }finally{backend.terminate();}
 };
 window.runWorkerContentionAudit=async mode=>{
  if(!['idle','worker'].includes(mode))throw Error('Invalid contention mode');
  const backend=new Worker(new URL('./mobility-worker-budget.js',import.meta.url),{type:'module'}),requests=new Map();let requestId=0;
  try{
   await new Promise((resolve,reject)=>{backend.onerror=e=>reject(Error(e.message));backend.onmessage=e=>{const row=e.data;if(row.kind==='ready')resolve();else if(row.kind==='error'){const p=requests.get(row.id);if(p){requests.delete(row.id);p.reject(Error(row.error));}else reject(Error(row.error));}else{const p=requests.get(row.id);if(p){requests.delete(row.id);p.resolve(row);}}};});
   const send=message=>new Promise((resolve,reject)=>{const id=++requestId;requests.set(id,{resolve,reject});backend.postMessage({...message,id});});
   const frames=[],jobs=[],timer=new GpuTimer(gl,64);let start=null,last=null,next=500,busy=false,frame=0;
   await new Promise((resolve,reject)=>{
    const draw=now=>{try{
     if(start===null)start=now;if(last!==null)frames.push({start:last,end:now,dt:now-last});last=now;
     if(mode==='worker'&&now-start>=next&&next<=6500&&!busy){next+=600;busy=true;const requestedAt=performance.now();send({kind:'start'}).then(()=>send({kind:'run',count:700,final:true})).then(result=>{jobs.push({requestedAt,receivedAt:performance.now(),startedAt:result.startedEpoch-performance.timeOrigin,finishedAt:result.finishedEpoch-performance.timeOrigin,workerMs:result.elapsed,hash:result.hash,queries:result.queries});busy=false;}).catch(reject);}
     clock.value=(now-start)/1000;const timed=timer.begin(frame++);renderer.render(scene,camera);if(timed)timer.end();
     if(now-start>=8000&&!busy){resolve();return;}requestAnimationFrame(draw);
    }catch(error){reject(error);}};requestAnimationFrame(draw);
   });
   for(let i=0;i<30&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}const gpu=timer.report();timer.dispose();
   const overlap=row=>jobs.some(job=>row.end>=job.startedAt&&row.start<=job.finishedAt),summary=rows=>{const values=rows.map(row=>row.dt);return {count:values.length,p95:percentile(values,.95),p99:percentile(values,.99),max:values.length?Math.max(...values):null,over50:values.filter(n=>n>50).length};};
   if(mode==='worker'&&(jobs.length!==11||jobs.some(j=>j.queries!==700||j.hash!==jobs[0].hash)))throw Error('Invalid worker workload');
   return {mode,device,frames:summary(frames),overlapping:summary(frames.filter(overlap)),nonOverlapping:summary(frames.filter(row=>!overlap(row))),jobs,gpu:{reason:gpu.reason,samples:gpu.samples.length,p95:percentile(gpu.samples.map(s=>s.ms),.95),p99:percentile(gpu.samples.map(s=>s.ms),.99),discarded:gpu.discarded},scope:'8-second isolated WebGL lab; 11 synthetic batches of 700 real native route queries in a Worker or idle control. Frame overlap is temporal, not proof of cause.'};
  }finally{backend.terminate();}
 };
 window.runWorkerBudgetExperiment=async(mode,count)=>{
  if(!['full','sliced'].includes(mode)||![450,700].includes(count))throw Error('Invalid budget experiment');
  const backend=new Worker(new URL('./mobility-worker-budget.js',import.meta.url),{type:'module'}),requests=new Map();let requestId=0;
  try{
   await new Promise((resolve,reject)=>{backend.onerror=e=>reject(Error(e.message));backend.onmessage=e=>{const row=e.data;if(row.kind==='ready')resolve();else if(row.kind==='error'){const p=requests.get(row.id);if(p){requests.delete(row.id);p.reject(Error(row.error));}else reject(Error(row.error));}else{const p=requests.get(row.id);if(p){requests.delete(row.id);p.resolve(row);}}};});
   const send=message=>new Promise((resolve,reject)=>{const id=++requestId;requests.set(id,{resolve,reject});backend.postMessage({...message,id});});
   let active=true,last=null,frameStart=null;const frames=[];
   const draw=now=>{if(!active)return;if(frameStart===null)frameStart=now;if(last!==null)frames.push(now-last);last=now;clock.value=(now-frameStart)/1000;renderer.render(scene,camera);requestAnimationFrame(draw);};requestAnimationFrame(draw);
   await new Promise(resolve=>setTimeout(resolve,300));await send({kind:'start'});
   const start=performance.now();let result,remaining=count,workerMs=0,slices=0;
   while(remaining){if(mode==='sliced')await new Promise(requestAnimationFrame);const amount=mode==='full'?remaining:Math.min(100,remaining);remaining-=amount;result=await send({kind:'run',count:amount,final:remaining===0});workerMs+=result.elapsed;slices++;}
   const latencyMs=performance.now()-start;await new Promise(resolve=>setTimeout(resolve,300));active=false;
   return {mode,count,latencyMs,workerMs,slices,queries:result.queries,found:result.found,unknown:result.unknown,hash:result.hash,frames:frames.length,intervals:{p95:percentile(frames,.95),p99:percentile(frames,.99),max:Math.max(...frames)},device,scope:'Synthetic fixed set of real native route queries; sliced mode waits for a render callback between batches, not an existing production scheduler.'};
  }finally{backend.terminate();}
 };
 // A synthetic external invalidation can be delivered while the planner is busy.
 // It does not establish when real world changes become authoritative.
 window.runMobilityWorkerInvalidationExperiment=async()=>{
  const receiver=createTrajectoryReceiver('lab-world'),actorId='lab-animal';
  const trajectory={session:'lab-world',actorId,version:1,kind:'trajectory',startTime:0,points:[{x:0,z:0},{x:1.4,z:0}],durations:[3.5],movementMode:'walk',animationState:'walk'};
  receiver.apply(trajectory,0);horizon.value=3.5;
  const job={id:nextId++,duration:500,requestedAt:performance.now()};pending.set(job.id,job);worker.postMessage({kind:'work',id:job.id,duration:job.duration});
  const deadline=performance.now()+5000;
  while(!Number.isFinite(job.startedAt)){if(workerError||performance.now()>deadline)throw Error(workerError||'Worker did not start');await new Promise(requestAnimationFrame);}
  if(Number.isFinite(job.receivedAt))throw Error('Worker completed before invalidation');
  const invalidatedAt=performance.now(),confirmedTime=1,confirmed=receiver.sample(actorId,confirmedTime),before=inspectPixels(confirmedTime);
  receiver.apply({session:'lab-world',actorId,version:2,kind:'stop',at:confirmedTime,point:{x:confirmed.x,z:confirmed.z},animationState:'idle'},confirmedTime);
  horizon.value=confirmedTime;const stoppedAt=performance.now();
  const stopped=inspectPixels(confirmedTime),after=inspectPixels(2);
  while(!Number.isFinite(job.receivedAt)){if(workerError||performance.now()>deadline)throw Error(workerError||'Worker did not finish');await new Promise(requestAnimationFrame);}
  const obsolete=receiver.apply(trajectory,confirmedTime),sample=receiver.sample(actorId,2);
  if(stoppedAt>=job.finishedAt||obsolete.accepted||obsolete.reason!=='stale'||sample.x!==confirmed.x||before.hash!==stopped.hash||stopped.hash!==after.hash)throw Error('Invalidation or stale-result check failed');
  horizon.value=3.5;
  return {device,invalidatedWhileBusy:true,workerElapsedMs:job.elapsed,invalidationToCompletionMs:job.receivedAt-invalidatedAt,stopToWorkerCompletionMs:job.finishedAt-stoppedAt,confirmedTime,confirmedPosition:confirmed,before,stopped,after,obsolete,sample};
 };
 window.runMobilityWorkerExperiment=async mode=>{
  if(!['main','worker'].includes(mode))throw Error('Invalid mode');
  const jobs=[],frames=[],timer=new GpuTimer(gl,64),schedule=[{at:500,duration:30},{at:1300,duration:50},{at:2100,duration:100},{at:2900,duration:100}];let next=0,last=null,start=null,frame=0;
  await new Promise((resolve,reject)=>{
   const draw=now=>{try{
    if(workerError)throw Error(workerError);if(start===null)start=now;
    if(last!==null)frames.push({at:now,dt:now-last});last=now;
    if(next<schedule.length&&now-start>=schedule[next].at){const request=schedule[next++],job={id:nextId++,duration:request.duration,requestedAt:performance.now()};jobs.push(job);if(mode==='worker'){pending.set(job.id,job);worker.postMessage({kind:'work',id:job.id,duration:job.duration});}else{job.startedAt=performance.now();Object.assign(job,workload.execute(job.duration));job.finishedAt=performance.now();job.receivedAt=job.finishedAt;}}
    clock.value=(now-start)/1000;const active=timer.begin(frame++);renderer.render(scene,camera);if(active)timer.end();
    if(now-start>=4000&&next===schedule.length&&jobs.every(job=>Number.isFinite(job.receivedAt))){resolve();return;}
    if(now-start>10000)throw Error('Experiment timed out');requestAnimationFrame(draw);
   }catch(error){reject(error);}};requestAnimationFrame(draw);
  });
  for(let i=0;i<30&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}
  const gpu=timer.report();timer.dispose();
  const intervals=frames.map(row=>row.dt),workWindows=jobs.map(job=>{const relevant=frames.filter(row=>row.at>=job.requestedAt&&row.at<=job.receivedAt+50).map(row=>row.dt);return {...job,requestToStartMs:job.startedAt-job.requestedAt,responseLatencyMs:job.receivedAt-job.requestedAt,maxIntervalMs:relevant.length?Math.max(...relevant):null};});
  if(jobs.some(job=>!job.queries||job.elapsed<job.duration)||frames.length<30)throw Error('Workload or frame samples invalid');
  return {mode,device,frames:frames.length,intervals:{p95:percentile(intervals,.95),p99:percentile(intervals,.99),max:Math.max(...intervals)},jobs:workWindows,gpu:{reason:gpu.reason,samples:gpu.samples.length,p95:percentile(gpu.samples.map(s=>s.ms),.95),p99:percentile(gpu.samples.map(s=>s.ms),.99),discarded:gpu.discarded},visual:window.mobilityWorkerReady};
 };
}catch(error){window.mobilityWorkerError=String(error?.stack??error);status.textContent=window.mobilityWorkerError;}

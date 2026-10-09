import {waitGpuPreparation} from './wait-gpu-preparation.js';

// Candidate for Three r180's normal target/output recipe. Own the readiness
// polling rather than leaving compileAsync's internal timer alive on abort.
// compile() still submits synchronously; this does not interrupt driver work.
export async function compileGpuPreparation(renderer,root,camera,scene,{check,signal,pollIntervalMs=10,selectPrograms,onPoll,now=()=>performance.now()}={}) {
 if(typeof check!=='function')throw Error('GPU compilation requires a lifetime check');
 if(selectPrograms!==undefined&&typeof selectPrograms!=='function')throw Error('Invalid GPU program selector');
 if(!Number.isFinite(pollIntervalMs)||pollIntervalMs<=0)throw Error('Invalid GPU compilation polling interval');
 const guard=()=>{check();if(signal?.aborted)throw signal.reason??new DOMException('GPU compilation cancelled','AbortError');};
 guard();
 const materials=renderer.compile(root,camera,scene);guard();
 // Capture selected programs before borrowed materials can be restored or
 // disposed. This matches compileAsync's currentProgram choice, not unrelated
 // variants previously compiled for the same material. A caller may explicitly
 // select all borrowed variants; selection is snapshotted before any await.
 const programs=snapshotGpuPrograms(renderer,materials,{check:guard,selectPrograms});
 await waitGpuPrograms(programs,{check:guard,signal,pollIntervalMs,onPoll,now});
}

// Borrowed recipes must be copied synchronously, before the caller restores
// material variants. Union identity is by native program, not material name.
export function snapshotGpuPrograms(renderer,materials,{check,selectPrograms}={}) {
 if(typeof check!=='function')throw Error('GPU compilation requires a lifetime check');
 const guard=check;
 const programs=new Set();
 for(const material of materials){
  guard();const properties=renderer.properties.get(material);
  const selected=selectPrograms?selectPrograms(properties,material):[properties.currentProgram];
  if(!selected||typeof selected[Symbol.iterator]!=='function')throw Error('GPU compilation has no selected readiness program');
  let count=0;
  for(const program of selected){guard();if(typeof program?.isReady!=='function')throw Error('GPU compilation has no selected readiness program');programs.add(program);count++;}
  if(count===0)throw Error('GPU compilation has no selected readiness program');
 }
 return programs;
}

// One owned poll of an already snapshotted union. The caller still owns driver
// submissions; cancellation only stops observation, not submitted driver work.
export async function waitGpuPrograms(selected,{check,signal,pollIntervalMs=10,onPoll,now=()=>performance.now()}={}) {
 if(typeof check!=='function')throw Error('GPU compilation requires a lifetime check');
 if(!Number.isFinite(pollIntervalMs)||pollIntervalMs<=0)throw Error('Invalid GPU compilation polling interval');
 const guard=()=>{check();if(signal?.aborted)throw signal.reason??new DOMException('GPU compilation cancelled','AbortError');};
 const programs=new Set(selected);guard();
 let resolveReady,timer;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const scan=()=>{
  guard();
  for(const program of programs){guard();if(program.isReady())programs.delete(program);}
  guard();if(programs.size===0)resolveReady();
 };
 const poll=onPoll?()=>{
  const start=now(),before=programs.size;let failed=false;
  try{scan();}catch(error){failed=true;throw error;}
  finally{const end=now();try{onPoll({label:'loading-program-readiness-poll',start,end,duration:end-start,failed,checkedProgramCount:before,pendingProgramCount:programs.size,pendingProgramIds:[...programs].map(program=>Number.isInteger(program.id)?program.id:null),scope:'Synchronous lifetime checks and native isReady queries for one poll; nested in awaited readiness, not GPU duration.'});}catch{}}
 }:scan;
 try{
  poll();
  await waitGpuPreparation(ready,{
   check:guard,signal,
   nextFrame:()=>new Promise((resolve,reject)=>{
    timer=setTimeout(()=>{timer=undefined;try{poll();resolve();}catch(error){reject(error);}},pollIntervalMs);
   })
  });
 }finally{clearTimeout(timer);programs.clear();}
}

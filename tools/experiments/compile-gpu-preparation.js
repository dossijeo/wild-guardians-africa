import {waitGpuPreparation} from './wait-gpu-preparation.js';

// Candidate for Three r180's normal target/output recipe. Own the readiness
// polling rather than leaving compileAsync's internal timer alive on abort.
// compile() still submits synchronously; this does not interrupt driver work.
export async function compileGpuPreparation(renderer,root,camera,scene,{check,signal,pollIntervalMs=10}={}) {
 if(typeof check!=='function')throw Error('GPU compilation requires a lifetime check');
 if(!Number.isFinite(pollIntervalMs)||pollIntervalMs<=0)throw Error('Invalid GPU compilation polling interval');
 const guard=()=>{check();if(signal?.aborted)throw signal.reason??new DOMException('GPU compilation cancelled','AbortError');};
 guard();
 const materials=renderer.compile(root,camera,scene);guard();
 // Capture selected programs before borrowed materials can be restored or
 // disposed. This matches compileAsync's currentProgram choice, not unrelated
 // variants previously compiled for the same material.
 const programs=new Set();
 for(const material of materials){
  const program=renderer.properties.get(material).currentProgram;
  if(typeof program?.isReady!=='function')throw Error('GPU compilation has no selected readiness program');
  programs.add(program);
 }
 let resolveReady,timer;
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 const poll=()=>{
  guard();
  for(const program of programs){guard();if(program.isReady())programs.delete(program);}
  guard();if(programs.size===0)resolveReady();
 };
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

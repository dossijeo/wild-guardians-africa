import {withScreenTarget} from './screen-target.js';
// Three r180 compileAsync uses properties.currentProgram.isReady internally.
// Snapshot those programs before borrowed depth materials are restored. Polling
// is bounded and cancellable; GL submission itself remains synchronous.
export function compileLoadingPrograms(renderer,scene,camera,targetScene,{signal,cancelled=()=>false,timeout=30000,now=()=>performance.now(),screen=false}={}) {
  const begin=now();
  const check=()=>{if(signal?.aborted||cancelled()||renderer.getContext().isContextLost())throw Error('Loading compilation cancelled');if(now()-begin>timeout)throw Error('Loading compilation timed out');};
  check();
  const materials=screen?withScreenTarget(renderer,()=>renderer.compile(scene,camera,targetScene)):renderer.compile(scene,camera,targetScene);
  const programs=new Set([...materials].map(material=>renderer.properties.get(material).currentProgram).filter(Boolean));
  return new Promise((resolve,reject)=>{
    let timer,settled=false;
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(scene);};
    const abort=()=>finish(Error('Loading compilation cancelled'));
    const poll=()=>{try{check();for(const program of programs)if(program.isReady())programs.delete(program);if(!programs.size){finish();return;}timer=setTimeout(poll,10);}catch(error){finish(error);}};
    signal?.addEventListener('abort',abort,{once:true});poll();
  });
}

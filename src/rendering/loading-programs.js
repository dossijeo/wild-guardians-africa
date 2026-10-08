import {withScreenTarget} from './screen-target.js';
// Three r180 compileAsync uses properties.currentProgram.isReady internally.
// Snapshot those programs before borrowed depth materials are restored. Polling
// is bounded and cancellable; GL submission itself remains synchronous.
export function compileLoadingPrograms(renderer,scene,camera,targetScene,{signal,cancelled=()=>false,timeout=30000,now=()=>performance.now(),screen=false}={}) {
  const begin=now();
  const check=()=>{if(signal?.aborted||cancelled()||renderer.getContext().isContextLost())throw Error('Loading compilation cancelled');if(now()-begin>timeout)throw Error('Loading compilation timed out');};
  check();
  const materials=screen?withScreenTarget(renderer,()=>renderer.compile(scene,camera,targetScene)):renderer.compile(scene,camera,targetScene);
  const programs=new Set();
  for(const material of materials){const properties=renderer.properties.get(material);for(const program of properties.programs?.values()??[properties.currentProgram])if(program)programs.add(program);}
  return new Promise((resolve,reject)=>{
    let timer,settled=false;
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(scene);};
    const abort=()=>finish(Error('Loading compilation cancelled'));
    const poll=()=>{try{check();for(const program of programs)if(program.isReady())programs.delete(program);if(!programs.size){finish();return;}timer=setTimeout(poll,10);}catch(error){finish(error);}};
    signal?.addEventListener('abort',abort,{once:true});poll();
  });
}

// Compile bounded views of the original objects against the complete native
// scene. No mesh is cloned, reparented or hidden: lights, fog, clipping, skinning
// and instancing retain the actual target-scene/object recipe. Restore screen
// state synchronously in each submission before yielding to the loading RAF.
export async function compileLoadingProgramsBatched(renderer,scene,camera,targetScene,{batchSize=4,nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),...options}={}) {
 if(!Number.isInteger(batchSize)||batchSize<1)throw Error('Loading compile batch size must be positive');
 const objects=[];scene.traverse(object=>{if(object.isMesh||object.isPoints||object.isLine||object.isSprite)objects.push(object);});
 const target=targetScene??scene;
 for(let start=0;start<objects.length;start+=batchSize){
  const batch=objects.slice(start,start+batchSize);
  const view={traverse:callback=>{for(const object of batch)callback(object);},traverseVisible:()=>{}};
  await compileLoadingPrograms(renderer,view,camera,target,options);
  await nextFrame();
 }
}

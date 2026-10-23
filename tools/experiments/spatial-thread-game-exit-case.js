export async function verifyGameExit(w){
 const retained=w.programLease;
 const handle=globalThis.qaThreadHandle,p=handle.core.preparation,session=w.spatialSession;
 let observed=false,disposalStates=[],disposePromise=null,lateInstalls=0,exitPromise=null;
 const start=p.start,dispose=session.dispose,install=w.installChunk;
 session.dispose=function(...args){disposalStates.push(p.status());disposePromise=dispose.apply(this,args);return disposePromise;};
 w.installChunk=function(...args){if(w.disposed)lateInstalls++;return install.apply(this,args);};
 p.start=function(...args){const id=start.apply(this,args);if(id>0&&!observed){observed=true;exitPromise=(async()=>{
  const deadline=performance.now()+10000;while(p.status()===1){if(performance.now()>deadline)throw Error('Start timeout');await new Promise(r=>setTimeout(r,0));}
  if(p.status()!==2)throw Error('Missed running phase');
  const before=p.status(),begin=performance.now();await globalThis.qaReturnToMenu();await disposePromise;
  return {before,elapsedMs:performance.now()-begin};
 })();}return id;};
 w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
 w.controls.target.x+=48;w.camera.position.x+=48;
 const deadline=performance.now()+30000;
 while(!exitPromise){if(performance.now()>deadline)throw Error('No streaming work');await new Promise(requestAnimationFrame);}
 let timer;let exit;try{exit=await Promise.race([exitPromise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Exit timeout')),30000);})]);}finally{clearTimeout(timer);}
 await new Promise(r=>setTimeout(r,200));
 const workers=Object.keys(handle.runtime.PThread.pthreads).length+handle.runtime.PThread.unusedWorkers.length;
 if(!w.disposed||workers||lateInstalls||p.status()!==5||!document.querySelector('#native-menu'))throw Error('Game exit cleanup failed');
 if(retained&&retained.stats.released+retained.stats.abandoned!==retained.stats.retained)throw Error('Retained program references leaked');
 return {...exit,programRetention:retained?.stats??null,disposalStates,worldDisposed:w.disposed,workers,lateInstalls,nativeStatus:p.status(),menu:true,stream:w.chunkStream.summary()};
}

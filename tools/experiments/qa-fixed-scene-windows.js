import {pause,resume} from '/src/simulation/game.js';
export async function fixedSceneWindows(w){
 const reason='qa-fixed-scene';pause(w.state,reason);
 const snapshot=()=>({elapsed:w.state.elapsed,time:w.state.time,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),chunks:[...w.chunks.keys()].sort(),geometries:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures,programs:w.renderer.info.programs.length});
 const ready=()=>{const s=w.chunkStream.summary();return !s.busy&&!s.queued&&!s.preparing&&!w.farVegetation?.adapters.some(a=>a.preparationPending());};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 try{
  await w.whenChunksReady();let previous='',stable=0;const deadline=performance.now()+60000;
  while(stable<20){if(performance.now()>deadline)throw Error('Fixed scene did not settle');await sleep(100);const next=JSON.stringify(snapshot());stable=ready()&&next===previous?stable+1:0;previous=next;}
  const before=snapshot(),windows=[];
  for(let i=0;i<3;i++){const start=performance.now();await sleep(10000);const end=performance.now(),after=snapshot();if(JSON.stringify(after)!==JSON.stringify(before)||!ready())throw Error('Fixed scene changed during window '+i);windows.push({start,end,snapshot:after});}
  return {before,windows,scope:'Paused simulation and fixed camera after residency/resource settling. Rendering continues; shader animation and driver scheduling are not frozen. Diagnostic only, not streaming acceptance.'};
 }finally{resume(w.state,reason);}
}

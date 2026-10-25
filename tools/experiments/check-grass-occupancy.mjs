import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),records=[];
try{for(const sceneCase of [1,6]){
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=global-lighting&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 '),null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const w=window.qaVisualReference.world;await(await import('/tools/experiments/qa-grass-streaming.js')).applyMaterialStudy(w);
  const {emit}=await import('/src/simulation/game.js'),d=w.groundDetails;
  const positions=()=>[...d.chunks.values()].flat(),p=positions()[0],initial=JSON.stringify([...d.chunks]);
  // Synthetic occupancy only in this disposable fixture; no gameplay implementation changed.
  const structure={id:'qa-grass-obstacle',kind:'wall',status:'built',x:p.x,z:p.z};w.state.structures.push(structure);
  emit(w.state,'PlacementCommitted',{targetId:structure.id});const placementDirty=d.dirtyChunks.size;d.flush(w.nav.field,w.state);
  if(!placementDirty||positions().some(q=>(q.x-p.x)**2+(q.z-p.z)**2<2.6))throw Error('Placement failed to clear grass');
  const removed=JSON.parse(initial).flatMap(([,a])=>a).length-positions().length;
  structure.status='ruined';emit(w.state,'StructureRuined',{targetId:structure.id});d.flush(w.nav.field,w.state);
  if(JSON.stringify([...d.chunks])!==initial)throw Error('Ruined obstacle failed to restore candidates');
  w.state.structures.pop();
  w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};w.render(.016);
  const hook=w.scene.onBeforeRender,timings=[];w.scene.onBeforeRender=function(...args){const start=performance.now();hook.apply(this,args);timings.push(performance.now()-start);};
  const frames=[];let previous=new Map();
  for(let i=0;i<120;i++){
   w.camera.position.x+=.25;w.controls.target.x+=.25;w.render(.016);
   const current=new Map(d.qaActive.map(p=>[p.id,p.scale]));let maxChange=0;
   for(const [id,scale] of current)if(previous.has(id))maxChange=Math.max(maxChange,Math.abs(scale-previous.get(id)));
   if(d.count>192||maxChange>1/6+1e-6)throw Error('Transition or capacity exceeded');
   frames.push({count:d.count,transitioning:[...current.values()].filter(s=>s>0&&s<1).length,maxChange,added:[...current.keys()].filter(k=>!previous.has(k)).length});previous=current;
   await new Promise(r=>setTimeout(r,16));
  }
  return {placementDirty,removed,restored:true,frames,hookCpuMs:timings,limitation:'CPU hook includes QA diagnostics; render cost and loading excluded; synthetic occupancy fixture'};
 });records.push({sceneCase,...result});await page.close();console.log(sceneCase,result.removed);
}await writeFile(process.env.WG_GRASS_CHECK_OUTPUT??'docs/qa/global-visual-lab/grass-streaming/occupancy-motion.json',JSON.stringify(records,null,2)+'\n');}finally{await browser.close()}

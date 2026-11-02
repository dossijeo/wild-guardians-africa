import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const runs=[],mangrove=process.env.SIM_MANGROVE==='1';let projection;
 for(const mode of ['main','worker','worker','main']){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));console.log(`${mode}: loading`);
  try{
   await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
   await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
   const row=await page.evaluate(async ({mode,mangrove})=>{
    const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong scene');r.setManual(true);
    const {createSimulation}=await import('/tests/browser/mobility-worker-simulation-core.js');let simulation,worker;
    if(mode==='main')simulation=await createSimulation({mangrove});else{worker=new Worker('/tests/browser/mobility-worker-simulation.js'+(mangrove?'?mangrove':''),{type:'module'});await new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.kind==='ready'?resolve():e.data.kind==='error'?reject(Error(e.data.error)):null;});}
    const gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),raf=()=>new Promise(requestAnimationFrame);let result,pending,sentAt,doneAt;
    try{
     for(let i=0;i<25;i++){await raf();w.render(0);}
     const frames=[],draw=[];
     for(let i=0;i<100;i++){
      const now=await raf();frames.push(now);
      if(i===10){sentAt=performance.now();if(mode==='main'){result=simulation.run(100,.1,{full:false});doneAt=performance.now();}else{pending=new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.kind==='result'?resolve(e.data):e.data.kind==='error'?reject(Error(e.data.error)):null;});worker.postMessage({kind:'run',id:1,steps:100,dt:.1,full:false});pending.then(value=>{result=value;doneAt=performance.now();});}}
      const start=performance.now();w.render(0);draw.push(performance.now()-start);
     }
     if(pending)await pending;const intervals=frames.slice(1).map((v,i)=>v-frames[i]);const stats=a=>{const s=[...a].sort((x,y)=>x-y),p=q=>s[Math.floor((s.length-1)*q)];return {count:s.length,p95:p(.95),p99:p(.99),max:s.at(-1)};};
     return {mode,projection:result.projection,responseMs:doneAt-sentAt,firstTickMs:result.timings[0],frames:stats(intervals),renderMs:stats(draw),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),mangroveNetwork:r.state.mangroveNetwork,sceneErrors:r.errors};
    }finally{simulation?.dispose();worker?.terminate();}
   },{mode,mangrove});
   if(errors.length||row.sceneErrors.length)throw Error(JSON.stringify({errors,sceneErrors:row.sceneErrors}));if(projection===undefined)projection=row.projection;else if(projection!==row.projection)throw Error('Selected simulation projection differs');delete row.projection;runs.push(row);console.log(JSON.stringify(row));
  }finally{await page.close();}
 }
 const report={runs,selectedProjectionEqual:true,scope:`Edge headless; frozen real WorldScene in mangrove islands and independent restored ${mangrove?'mangrove raid converted to islands with nine synthetic chunks':'savanna raid'} simulation. 100 steps are artificially batched. Not an integrated Worker-owned game: displayed world does not consume the simulation projection. No input, audio or gameplay parity, GPU timer or physics manager in the separate simulation.`};
 await writeFile(`docs/lighting/tree-near-retexture/performance/mobility-simulation-worker-${mangrove?'mangrove-':''}scene-abba.json`,JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}

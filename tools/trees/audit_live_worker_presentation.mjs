import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});await page.locator('#stress').evaluate(e=>e.click());await page.waitForFunction(()=>{const r=window.treeReview;return r.state.raid?.animals.length===20&&r.state.raid.animals.every(a=>r.world.mixers.has(a.id));},null,{timeout:120000});
 const report=await page.evaluate(async()=>{
  const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Wrong scene');r.setManual(true);
  const {serialize}=await import('/src/persistence/snapshots.js'),source=serialize(r.state).replaceAll('"qa-beast-0"','"qa-beast-1000000"'),chunks=[...w.chunks.keys()],worker=new Worker('/tests/browser/mobility-worker-live-snapshot.js',{type:'module'}),raf=()=>new Promise(requestAnimationFrame);
  const request=data=>new Promise((resolve,reject)=>{worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>e.data.kind==='error'?reject(Error(e.data.error)):resolve(e.data);worker.postMessage(data);});
  try{
   const init=await request({kind:'init',source,chunks});for(let i=0;i<25;i++){await raf();w.render(0);}
   let received=null,sentAt,receivedAt,appliedAt,moved=0,applied=0,maxPositionError=0,pending,verified=false;const frames=[],draw=[],baseline=new Map(r.state.raid.animals.map(a=>[a.id,{x:a.x,z:a.z}]));
   for(let i=0;i<120;i++){
    const t=await raf();frames.push(t);
    if(i===10){sentAt=performance.now();pending=request({kind:'run',steps:1}).then(row=>{received=row;receivedAt=performance.now();});}
    if(received&&!appliedAt){
     const data=JSON.parse(received.projection);for(const item of data.animals){const id=item.id==='qa-beast-1000000'?'qa-beast-0':item.id,animal=r.state.raid.animals.find(a=>a.id===id);if(!animal)throw Error('Unknown actor '+id);if(Math.hypot(animal.x-item.x,animal.z-item.z)>1e-9)moved++;animal.x=item.x;animal.z=item.z;applied++;}appliedAt=performance.now();
    }
    const start=performance.now();w.render(0);draw.push(performance.now()-start);
    if(received&&appliedAt&&!verified){for(const item of JSON.parse(received.projection).animals){const id=item.id==='qa-beast-1000000'?'qa-beast-0':item.id,root=w.objects.get(id);maxPositionError=Math.max(maxPositionError,Math.hypot(root.position.x-item.x,root.position.z-item.z));}verified=true;}
   }
   if(pending)await pending;if(!received||!appliedAt||applied!==20)throw Error('Worker result not applied');
   const intervals=frames.slice(1).map((t,i)=>({start:frames[i],end:t,ms:t-frames[i]})),overlap=intervals.filter(x=>x.end>=sentAt&&x.start<=receivedAt),stats=a=>{const v=[...a].sort((x,y)=>x-y),p=q=>v[Math.floor((v.length-1)*q)];return {count:v.length,p95:p(.95),p99:p(.99),max:v.at(-1)};};
   return {animals:applied,moved,initializationMs:init.initializationMs,workerTickMs:received.timings[0],responseMs:receivedAt-sentAt,applyDelayMs:appliedAt-receivedAt,frames:stats(intervals.map(x=>x.ms)),overlapFrames:stats(overlap.map(x=>x.ms)),renderMs:stats(draw),maxPositionError,baselineCount:baseline.size,sceneErrors:r.errors};
  }finally{worker.terminate();}
 });
 if(errors.length||report.sceneErrors.length)throw Error(JSON.stringify({errors,report}));
 report.scope='Single frozen mangrove QA scene with 20 animals; Worker restores adapted copy and executes one tick; after response the test copies only x/z back for rendering. This is not an authoritative gameplay bridge, synchronization, GPU trajectory, collision, pose, input or visual-equivalence proof. Initialization happens before measurement; no GPU timer.';
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-live-worker-presentation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const runs=[];for(let i=0;i<3;i++){const page=await browser.newPage();try{await page.goto('http://127.0.0.1:5175/tests/browser/mobility-physics-parity.html');await page.waitForFunction(()=>window.ready,{timeout:120000});runs.push(await page.evaluate(()=>window.audit()));}finally{await page.close();}}
 const report={runs,scope:'Edge headless, real Rapier and geometry-only rig independently loaded in main thread and browser Worker, flat terrain and repeated hit. Selected logical fields and physical pose compared every step; no Game.tick, rendered pose, live GLTF materials, crowd, obstacles or FPS measurement. Timings not comparable as a performance benchmark.'};
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-browser-physics-worker-parity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

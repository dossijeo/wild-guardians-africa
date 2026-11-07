import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const crowd=process.env.PHYSICS_CROWD==='1',precision=process.env.PHYSICS_PRECISION==='1',reconstruct=process.env.PHYSICS_RECONSTRUCT==='1'||precision,runs=[];for(let i=0;i<3;i++){const page=await browser.newPage();try{await page.goto('http://127.0.0.1:5175/tests/browser/mobility-physics-parity.html');await page.waitForFunction(()=>window.ready,null,{timeout:120000});runs.push(await page.evaluate(options=>window.audit(options),{crowd,reconstruct,precision}));}finally{await page.close();}}
 const report={runs,scope:`Edge headless, real Rapier, authored recovery clip and geometry-only rigs independently loaded in main thread and browser Worker, flat terrain and repeated hit. ${crowd?'Two actors and one prop.':'One actor.'} Selected logical fields, physical pose and all bone world matrices compared every step; no Game.tick, WebGL pixels, live GLTF materials or FPS measurement. Timings not comparable as a performance benchmark.`};
 await writeFile(`docs/lighting/tree-near-retexture/performance/mobility-browser-physics-worker-${precision?'precision-':reconstruct?'reconstruction-':crowd?'crowd-':''}parity.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

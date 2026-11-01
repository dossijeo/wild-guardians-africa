import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const report=[];
 for(const full of [true,false,false,true]){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(process.env.MOBILITY_SIMULATION_URL||'http://127.0.0.1:5175/tests/browser/mobility-worker-simulation.html');
  await page.waitForFunction(()=>window.simulationWorkerReady||window.simulationWorkerError,null,{timeout:120000});
  const error=await page.evaluate(()=>window.simulationWorkerError);if(error)throw Error(error);
  report.push(await page.evaluate(full=>window.runSimulationWorkerAudit(full),full));if(errors.length)throw Error(errors.join('\n'));await page.close();
 }
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-worker-projection-parity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const runs=[];let projection;
 const mangrove=process.env.SIM_MANGROVE==='1';
 for(const mode of ['main','worker','worker','main']){
  const page=await browser.newPage();try{await page.goto('http://127.0.0.1:5175/tests/browser/mobility-simulation-frame-audit.html'+(mangrove?'?mangrove':''));await page.waitForFunction(()=>window.ready,null,{timeout:120000});const row=await page.evaluate(mode=>window.audit(mode),mode);if(projection===undefined)projection=row.projection;else if(row.projection!==projection)throw Error('Selected simulation state diverged');delete row.projection;runs.push(row);}finally{await page.close();}
 }
 const report={runs,selectedProjectionEqual:true,scope:`Edge headless, restored saved raid and real simulation ticks; simple WebGL clear only, no WorldScene, physics manager, user input, audio or gameplay publication. One artificially batched 100-step request per session, not a single slow navigation operation. ${mangrove?'Mangrove snapshot synthetically converted to islands and nine resident chunks.':'Saved savanna scenario.'} Frame percentiles have 119 samples and cannot represent full production.`};
 await writeFile(`docs/lighting/tree-near-retexture/performance/mobility-simulation-worker-${mangrove?'mangrove-':''}frame-abba.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

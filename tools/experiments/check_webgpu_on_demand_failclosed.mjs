import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try{for(const scenario of ['no-api','no-adapter','webgl-control']){
 const page=await browser.newPage();
 if(scenario==='no-api')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'gpu',{configurable:true,get:()=>undefined}));
 if(scenario==='no-adapter')await page.addInitScript(()=>{if(!navigator.gpu)throw Error('WebGPU required for fallback test');Object.defineProperty(navigator.gpu,'requestAdapter',{configurable:true,value:async()=>null});});
 await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/webgpu-on-demand.html?backend=${scenario==='webgl-control'?'webgl':'webgpu'}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const x=window.wildGuardiansWebGpuLabStatus?.();return x&&(x.backend||x.errors);},null,{timeout:60000});
 const result=await page.evaluate(()=>({report:window.wildGuardiansWebGpuLabReport(),status:document.querySelector('#status').textContent}));
 if(scenario==='webgl-control'?(result.report.backendActual!=='WebGL2'||result.report.errors.length):(result.report.backendActual!==null||!result.report.errors.length))throw Error('Fail-closed test failed: '+JSON.stringify({scenario,result}));
 results.push({scenario,backendActual:result.report.backendActual,errors:result.report.errors,status:result.status});await page.close();
 }
 const page=await browser.newPage();await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/webgpu-on-demand.html?backend=webgl`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.wildGuardiansWebGpuLabStatus?.().backend==='WebGL2',null,{timeout:60000});await page.click('#reset');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const start=performance.now();while(performance.now()-start<2150){}requestAnimationFrame(()=>requestAnimationFrame(resolve));})));
 const intervals=await page.evaluate(()=>window.wildGuardiansWebGpuLabReport().frameIntervalsMs),max=Math.max(...intervals);if(max<=2000)throw Error('Long RAF interval was not recorded');results.push({scenario:'long-interval',maxMs:max});await page.close();
}finally{await browser.close();}
const output=JSON.stringify({results});if(process.env.WG_OUTPUT)await writeFile(process.env.WG_OUTPUT,output);else console.log(output);

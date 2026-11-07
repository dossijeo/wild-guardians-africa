import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu-shader-disk-cache','--disable-http-cache']});
try{
 const page=await browser.newPage({viewport:{width:700,height:900}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('requestfailed',request=>errors.push(`${request.url()}: ${request.failure()?.errorText}`));
 const shared=process.env.WG_GRASS_SHARED==='1';await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/uber-grass-real.html?shared=${shared?1:0}&bench=1`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.uberGrassResult?.benchmarkReady||window.uberGrassResult?.done,{timeout:180000});const status=await page.evaluate(()=>window.uberGrassResult);if(!status.benchmarkReady)throw Error(JSON.stringify(status));
 await page.evaluate(()=>window.runUberGrassBenchmark());await page.waitForFunction(()=>window.uberGrassResult?.done,{timeout:60000});const result=await page.evaluate(()=>window.uberGrassResult);
 if(result.backend!=='WebGPU real'||result.errors.length||errors.length||result.benchmark?.interactive.length!==180)throw Error(JSON.stringify({errors,result}));
 if(result.benchmark.supported&&(result.benchmark.gpu.length!==40||result.benchmark.gpu.some(value=>!Number.isFinite(value)||value<0)))throw Error('Invalid GPU timestamp samples: '+JSON.stringify(result.benchmark.gpu));
 const json=JSON.stringify(result);if(process.env.WG_OUTPUT)await writeFile(process.env.WG_OUTPUT,json);else console.log(json);
}finally{await browser.close();}

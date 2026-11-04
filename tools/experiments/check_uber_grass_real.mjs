import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:700,height:900}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('requestfailed',request=>errors.push(`${request.url()}: ${request.failure()?.errorText}`));
 await page.addInitScript(()=>{window.__pipelineCount=0;window.__shaderCount=0;for(const name of ['createRenderPipeline','createRenderPipelineAsync','createShaderModule']){const proto=GPUDevice.prototype,original=proto[name];proto[name]=function(...args){if(name==='createShaderModule')window.__shaderCount++;else window.__pipelineCount++;return original.apply(this,args);};}});
 const shared=process.env.WG_GRASS_SHARED==='1',swap=process.env.WG_GRASS_SWAP==='1';await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/uber-grass-real.html?shared=${shared?1:0}&swap=${swap?1:0}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.uberGrassResult?.done,{timeout:180000});const result=await page.evaluate(()=>window.uberGrassResult);
 if(result.backend!=='WebGPU real'||result.errors.length||errors.length||result.frames.length!==8||result.scenes.length!==2||result.frames.some(f=>f.nonBackground<500||!f.drawCalls))throw Error(JSON.stringify({result,errors}));
 if(result.frames.slice(2).some(f=>f.pipelines!==result.frames[1].pipelines))throw Error('Unexpected new pipeline on time/night changes: '+JSON.stringify(result.frames));
 if(process.env.WG_SCREENSHOT)await page.screenshot({path:process.env.WG_SCREENSHOT,fullPage:true});const json=JSON.stringify(result);if(process.env.WG_OUTPUT)await writeFile(process.env.WG_OUTPUT,json);else console.log(json);
}finally{await browser.close();}

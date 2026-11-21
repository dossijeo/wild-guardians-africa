import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{window.__pipelineCount=0;for(const name of ['createRenderPipeline','createRenderPipelineAsync']){const proto=GPUDevice.prototype,original=proto[name];proto[name]=function(...args){window.__pipelineCount++;return original.apply(this,args);};}});
 await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/tests/browser/shared-material-parameter.html`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.sharedMaterialGpuResult?.done,{timeout:60000});const result=await page.evaluate(()=>window.sharedMaterialGpuResult);
 const red=p=>p[0]>p[1]*2&&p[0]>30,green=p=>p[1]>p[0]*2&&p[1]>30;
 for(const name of ['uniform','texture']){const trial=result[name];if(!trial||!red(trial.before.left)||!green(trial.before.right)||!green(trial.after.left)||!red(trial.after.right)||trial.pipelineAfter!==trial.pipelineBefore)errors.push('Failed '+name+': '+JSON.stringify(trial));}
 if(result.backend!=='WebGPU real'||result.errors.length||errors.length)throw Error(JSON.stringify({result,errors}));
 const output=JSON.stringify(result);if(process.env.WG_OUTPUT)await writeFile(process.env.WG_OUTPUT,output);else console.log(output);
}finally{await browser.close();}

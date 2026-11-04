import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(modulePath).href);
const output='docs/qa/filament-evaluation/automatic-instancing';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const mode of ['automatic','automatic-no-shadows','control']){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),messages=[];
  page.on('pageerror',e=>messages.push(String(e)));
  page.on('console',e=>{if(['warning','error'].includes(e.type()))messages.push(e.text())});
  await page.addInitScript(()=>{
   const serialize=value=>{
    if(value===undefined)return '<undefined>';
    if(value===null||typeof value!=='object')return value;
    if(value instanceof GPUBuffer)return {type:'GPUBuffer',label:value.label,size:value.size,usage:value.usage};
    if(value instanceof GPUBindGroupLayout)return {type:'GPUBindGroupLayout',label:value.label};
    if(value instanceof GPUTextureView)return {type:'GPUTextureView',label:value.label};
    if(value instanceof GPUSampler)return {type:'GPUSampler',label:value.label};
    if(Array.isArray(value))return value.map(serialize);
    return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,serialize(v)]));
   };
   window.bindGroupDiagnostics={calls:0,failed:[],last:[]};
   const original=GPUDevice.prototype.createBindGroup;
   GPUDevice.prototype.createBindGroup=function(descriptor){
    const record=serialize(descriptor);window.bindGroupDiagnostics.calls++;
    window.bindGroupDiagnostics.last.push(record);if(window.bindGroupDiagnostics.last.length>6)window.bindGroupDiagnostics.last.shift();
    try{return original.call(this,descriptor)}catch(error){window.bindGroupDiagnostics.failed.push({descriptor:record,error:String(error),stack:error.stack});throw error}
   };
  });
  if(mode==='automatic-no-shadows')await page.route('**/benchmark.js',async route=>{
   const response=await route.fetch();const text=await response.text();
   await route.fulfill({response,body:text.replace('view.setShadowingEnabled(!snapshot)','view.setShadowingEnabled(false)').replace('.castShadows(true)','.castShadows(false)')});
  });
  const started=Date.now();
  await page.goto(`http://127.0.0.1:5296/tools/filament-evaluation/benchmark.html?backend=filament&scenario=A&optimized=${mode==='control'?0:1}`);
  await page.waitForFunction(()=>window.benchReady||window.benchFailed,null,{timeout:180000});
  const result=await page.evaluate(()=>({ready:!!window.benchReady,failed:!!window.benchFailed,errors:window.benchErrors,diagnostics:window.bindGroupDiagnostics,identity:window.bench?.rendererIdentity}));
  await page.screenshot({path:`${output}/${mode}.png`});
  await writeFile(`${output}/${mode}.json`,JSON.stringify({mode,elapsedMs:Date.now()-started,...result,messages},null,2)+'\n');
  console.log(JSON.stringify({mode,ready:result.ready,failed:result.failed,calls:result.diagnostics.calls,bindErrors:result.diagnostics.failed}));
  await page.close();
 }
}finally{await browser.close()}

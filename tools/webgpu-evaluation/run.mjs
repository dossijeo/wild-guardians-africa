import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.WG_GPU_OUT??'docs/qa/webgpu-evaluation/results';
await mkdir(out,{recursive:true});
const scenarios=(process.env.WG_GPU_SCENARIOS??'grass,grass-river,terrain,complex').split(',');
const samples=Number(process.env.WG_GPU_SAMPLES??120),frames=Number(process.env.WG_GPU_FRAMES??180);
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try{
 for(const scenario of scenarios){
  const backends=(process.env.WG_GPU_ORDER??(scenario!=='terrain'?'legacy,webgpu,legacy,webgpu,webgl-tsl,webgpu,webgl-tsl,webgpu':'webgl-tsl,webgpu,webgl-tsl,webgpu')).split(',');
  for(let run=0;run<backends.length;run++){
   const backend=backends[run],page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
   const consoleErrors=[];
   page.on('pageerror',e=>consoleErrors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
   await page.goto(`http://127.0.0.1:5294/tools/webgpu-evaluation/index.html?scenario=${scenario}&backend=${backend}`);
   try{await page.waitForFunction(()=>window.qaReady,null,{timeout:120000})}
   catch(e){throw Error(JSON.stringify({scenario,backend,consoleErrors,cause:e.message}))}
   for(const night of [0,1]){
    const capture=await page.evaluate(night=>window.qa.capture({night}),night);
    await writeFile(`${out}/${scenario}-${backend}-${run}-${night?'night':'day'}.png`,Buffer.from(capture.image.split(',')[1],'base64'));
    const report=await page.evaluate(options=>window.qa.run(options),{samples,frames,warmup:45,night,moving:true});
    const item={run,...report,capture:{...capture,image:undefined},consoleErrors:[...consoleErrors]};records.push(item);
    await writeFile(`${out}/${scenario}-${backend}-${run}-${night}.json`,JSON.stringify(item,null,2));
    const valid=report.timed.filter(s=>s.gpu.valid);
    console.log(JSON.stringify({scenario,backend,run,night,valid:valid.length,gpuMean:valid.reduce((a,s)=>a+s.gpu.ms,0)/valid.length,errors:consoleErrors.length}));
    if(consoleErrors.length||report.errors.length)throw Error(JSON.stringify(consoleErrors.concat(report.errors)));
   }
   const cleanup=await page.evaluate(()=>{window.qa.dispose();return {errors:window.qa.errors}});
   await writeFile(`${out}/${scenario}-${backend}-${run}-cleanup.json`,JSON.stringify(cleanup,null,2));
   if(cleanup.errors.length)throw Error(JSON.stringify(cleanup.errors));
   await page.close();
  }
 }
}finally{
 await writeFile(`${out}/index.json`,JSON.stringify({created:new Date().toISOString(),records:records.map(({timed,interactive,...r})=>r)},null,2));
 await browser.close();
}

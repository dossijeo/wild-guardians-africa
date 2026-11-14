import {createRequire} from 'node:module';
import {createWriteStream} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {once} from 'node:events';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const mode=process.env.WG_MODE??'direct';if(!['direct','async'].includes(mode))throw Error('WG_MODE must be direct or async');
const tracePath=process.env.WG_TRACE_PATH??'webgpu-frame-trace.json',reportPath=process.env.WG_OUTPUT??'webgpu-frame-report.json';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu-shader-disk-cache','--disable-http-cache']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`${process.env.WG_BASE_URL??'http://127.0.0.1:5175'}/webgpu-on-demand.html?backend=webgpu&source=full&target=live`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWebGpuLabStatus?.().backend||window.wildGuardiansWebGpuLabStatus?.().errors,null,{timeout:60000});
 const initial=await page.evaluate(()=>window.wildGuardiansWebGpuLabReport());if(initial.backendActual!=='WebGPU real'||initial.errors.length)throw Error(JSON.stringify(initial));
 await page.selectOption('#mode',mode);await page.click('#load');await page.waitForFunction(()=>!document.querySelector('#sequence').disabled||window.wildGuardiansWebGpuLabStatus?.().errors,null,{timeout:180000});
 const cdp=await browser.newBrowserCDPSession();await cdp.send('Tracing.start',{categories:'toplevel,devtools.timeline,blink.user_timing,gpu,disabled-by-default-devtools.timeline.frame',transferMode:'ReturnAsStream'});
 await page.click('#reset');const traceMarkMs=await page.evaluate(()=>{performance.mark('WG_SEQUENCE_START');return performance.now();});
 await page.click('#sequence');await page.waitForFunction(()=>{const status=window.wildGuardiansWebGpuLabStatus?.();return status?.appearances===10&&!status.running;},null,{timeout:240000});await page.waitForTimeout(1000);
 const report=await page.evaluate(()=>window.wildGuardiansWebGpuLabReport());if(report.errors.length||errors.length||report.appearances.some(row=>!row.success))throw Error(JSON.stringify({errors,reportErrors:report.errors}));
 const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await complete;if(!stream)throw Error('No trace stream');
 const file=createWriteStream(tracePath);for(;;){const part=await cdp.send('IO.read',{handle:stream,size:1048576});const chunk=part.base64Encoded?Buffer.from(part.data,'base64'):part.data;if(!file.write(chunk))await once(file,'drain');if(part.eof)break;}file.end();await once(file,'finish');await cdp.send('IO.close',{handle:stream});
 await writeFile(reportPath,JSON.stringify({mode,traceMarkMs,report,limitations:['Trace instrumentation perturbs timings.','Trace events and thread names do not by themselves identify driver or GPU execution causes.','A browser context does not guarantee a cold driver cache.']}));
}finally{await browser.close();}

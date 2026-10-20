import {writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.WG_QA_URL??'http://127.0.0.1:5221';
const rows=[];
const percentile=(values,p)=>values.sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
for(const arm of ['off','event','event','off']){
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  await context.addInitScript(value=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',microevents:value})),arm==='off'?'off':'adaptive');
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  try{
    await page.goto(`${base}/?qa-microevents&qa-microevents-fixture=wood`,{waitUntil:'domcontentloaded',timeout:180000});
    await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false',null,{timeout:120000});
    if(arm==='event'){
      await page.waitForFunction(()=>!!window.__microevents,null,{timeout:10000});
      const forced=await page.evaluate(async()=>{const c=window.__microevents;await c.billboards.ready;return c.force('seeds');});
      if(!forced)throw Error('Seeds could not spawn');
    }
    const sample=await page.evaluate(async()=>{
      const frames=[];
      for(let i=0;i<12;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
      let last=performance.now(),maxInstances=0;
      for(let i=0;i<80;i++)await new Promise(resolve=>requestAnimationFrame(now=>{frames.push(now-last);last=now;maxInstances=Math.max(maxInstances,window.__microevents?.billboards.count??0);resolve();}));
      const c=window.__microevents;
      return {frames,controller:c?{samples:[...c.frameSamples],maxInstances,completed:c.metrics.completed,renderer:c.diagnostic?.dataset.renderer}:null};
    });
    rows.push({arm,frameMedianMs:percentile(sample.frames,.5),frameP95Ms:percentile(sample.frames,.95),controllerMedianMs:sample.controller?.samples.length?percentile(sample.controller.samples,.5):null,controllerP95Ms:sample.controller?.samples.length?percentile(sample.controller.samples,.95):null,maxInstances:sample.controller?.maxInstances,renderer:sample.controller?.renderer,errors});
  }catch(error){rows.push({arm,error:String(error),errors});}
  await context.close();
}
await browser.close();
const target=process.argv[2]??'test-results/microevents-main-browser/performance.json';
mkdirSync(new URL('.',pathToFileURL(target).href),{recursive:true});
writeFileSync(target,JSON.stringify({scope:'Intel UHD Chrome, 80 rAF intervals per arm, fixed QA world, ABBA. Browser frame intervals include rendering and unrelated runtime; controller samples are JS CPU only. Simulation frozen for reproducible fixture.',rows},null,2)+'\n');
console.log(JSON.stringify(rows));
if(rows.some(row=>row.error||row.errors.length))process.exitCode=1;

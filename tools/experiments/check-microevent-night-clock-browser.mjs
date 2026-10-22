import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {dirname} from 'node:path';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('WG_QA_PLAYWRIGHT_MODULE is required');
const {chromium}=await import(pathToFileURL(modulePath).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
let report;
try{
  await page.goto(`${process.env.WG_QA_URL??'http://127.0.0.1:5221'}/?qa-microevents&qa-microevents-fixture=wet`,{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});
  report=await page.evaluate(async()=>{
    const event=window.__microevents;
    await event.billboards.ready;
    const state=event.state;
    state.time=310;
    state.nightPlan={at:9999,done:true,group:[]};
    if(state.raid||state.pauses.length)throw Error('QA farm is not in an unpaused calm night');
    const url=new URL(location.href);
    url.searchParams.delete('qa-microevents-fixture');
    history.replaceState(null,'',url);
    const measure=async()=>{
      const start=performance.now(),before=state.elapsed;
      await new Promise(resolve=>setTimeout(resolve,1200));
      return {realSeconds:(performance.now()-start)/1000,simulatedSeconds:state.elapsed-before,clock:state.time};
    };
    const before=await measure();
    const originalSave=event.save;
    let releaseSave;
    event.save=()=>new Promise(resolve=>{releaseSave=()=>resolve(true);});
    const spawning=event.force('fireflies');
    const preparationDeadline=performance.now()+5000;
    while(!releaseSave&&performance.now()<preparationDeadline)
      await new Promise(resolve=>setTimeout(resolve,0));
    const pendingAtStart=event.pending;
    if(!pendingAtStart||!releaseSave)throw Error('Night event did not enter its save/preparation phase');
    const preparing=await measure();
    const pendingAtEnd=event.pending;
    releaseSave();
    const forced=await spawning;
    event.save=originalSave;
    if(!forced)throw Error('Night fireflies failed to spawn in the real loop');
    const activeAtStart=event.active?.def.id;
    const during=await measure();
    const activeAtEnd=event.active?.def.id;
    event.cancel('qa');
    const after=await measure();
    return {before,preparing,during,after,pendingAtStart,pendingAtEnd,
      forced,activeAtStart,activeAtEnd,finalActive:event.active?.def.id??null,
      renderer:event.diagnostic?.dataset.renderer};
  });
}finally{await page.close();await browser.close();}
report.errors=errors;
const rate=part=>part.simulatedSeconds/part.realSeconds;
report.rates={before:rate(report.before),preparing:rate(report.preparing),
  during:rate(report.during),after:rate(report.after)};
const path=process.argv[2];
if(path){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
if(errors.length||!report.forced||!report.pendingAtStart||!report.pendingAtEnd||
  report.activeAtStart!=='fireflies'||report.activeAtEnd!=='fireflies'||report.finalActive!==null||
  report.rates.before<report.rates.during*2.5||report.rates.after<report.rates.during*2.5||
  report.rates.preparing<.5||report.rates.preparing>1.5||
  report.rates.during<.5||report.rates.during>1.5)process.exitCode=1;

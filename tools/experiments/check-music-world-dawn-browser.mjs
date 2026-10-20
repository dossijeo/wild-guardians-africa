import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const days=Number(process.env.WG_QA_DAYS??3);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5189';
const output=process.argv[2];
if(!output)throw Error('Usage: check-music-world-dawn-browser.mjs OUTPUT.json');
const maxRunMs=Number(process.env.WG_QA_MAX_MS??Math.max(900000,days*600000));
if(!Number.isFinite(maxRunMs)||maxRunMs<=0)throw Error('WG_QA_MAX_MS must be positive');
const browser=await chromium.launch({channel:process.env.WG_QA_BROWSER??'chrome',headless:process.env.WG_QA_HEADLESS!=='0'});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
let lastReport=null,terminalSaved=false;
const save=async(report,driverStatus,detail=null)=>{
  lastReport={...report,browserErrors:errors,driver:{status:driverStatus,...(detail?{detail}:{})}};
  await writeFile(output,JSON.stringify(lastReport,null,2)+'\n');
};
try{
  await page.goto(`${base}/tests/browser/music-world-dawn.html?days=${days}`);
  await page.waitForFunction(()=>document.querySelector('#run')?.disabled===false||
    document.querySelector('#status')?.textContent?.startsWith('FAIL:'),null,{timeout:120000});
  const ready=await page.locator('#status').textContent();
  if(ready.startsWith('FAIL:'))throw Error(`Fixture setup: ${ready}`);
  await page.locator('#run').click();
  const deadline=Date.now()+maxRunMs;
  let lastSteps=-1,lastProgress=Date.now();
  for(;;){
    const status=await page.locator('#status').textContent();
    if(/^(Completada|FAIL:)/.test(status))break;
    const progress=JSON.parse(await page.locator('#report').textContent());
    if(progress.steps!==lastSteps){lastSteps=progress.steps;lastProgress=Date.now();}
    const reason=Date.now()>deadline?'deadline-exceeded':
      Date.now()-lastProgress>180000?'stalled':null;
    await save(progress,reason??'running',reason?{status,day:progress.day,steps:progress.steps}:null);
    if(reason){terminalSaved=true;throw Error(`Music fixture ${reason}: ${JSON.stringify({status,
      phase:progress.phase,day:progress.day,steps:progress.steps,errors:progress.errors})}`);}
    console.error(`${progress.phase}: day ${progress.day}, steps ${progress.steps}`);
    await page.waitForTimeout(15000);
  }
  const result=JSON.parse(await page.locator('#report').textContent());
  await save(result,result.phase==='complete'?'complete':'fixture-failed');terminalSaved=true;
  if(result.errors?.length||errors.length||result.phase!=='complete')
    throw Error(`Music fixture failed: ${JSON.stringify({phase:result.phase,errors:result.errors,browserErrors:errors})}`);
  console.log(JSON.stringify({days:result.requestedDays,steps:result.steps,history:result.history.map(item=>item.pack),
    events:result.events,peakPoolPcmBytes:result.peakPoolPcmBytes,context:result.context}));
}catch(error){
  if(lastReport&&!terminalSaved)await save(lastReport,'driver-error',String(error));
  throw error;
}finally{await browser.close();}

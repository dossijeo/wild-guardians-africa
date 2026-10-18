import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const days=Number(process.env.WG_QA_DAYS??3);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5189';
const output=process.argv[2];
if(!output)throw Error('Usage: check-music-world-dawn-browser.mjs OUTPUT.json');
const browser=await chromium.launch({channel:process.env.WG_QA_BROWSER??'chrome',headless:process.env.WG_QA_HEADLESS!=='0'});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',error=>errors.push(String(error)));
try{
  await page.goto(`${base}/tests/browser/music-world-dawn.html?days=${days}`);
  await page.waitForFunction(()=>document.querySelector('#run')?.disabled===false||
    document.querySelector('#status')?.textContent?.startsWith('FAIL:'),null,{timeout:120000});
  const ready=await page.locator('#status').textContent();
  if(ready.startsWith('FAIL:'))throw Error(`Fixture setup: ${ready}`);
  await page.locator('#run').click();
  const deadline=Date.now()+Math.max(300000,days*300000);
  let lastSteps=-1,lastProgress=Date.now();
  for(;;){
    const status=await page.locator('#status').textContent();
    if(/^(Completada|FAIL:)/.test(status))break;
    const progress=JSON.parse(await page.locator('#report').textContent());
    if(progress.steps!==lastSteps){lastSteps=progress.steps;lastProgress=Date.now();}
    if(Date.now()>deadline||Date.now()-lastProgress>180000)
      throw Error(`Music fixture stalled or timed out: ${JSON.stringify({status,phase:progress.phase,
        day:progress.day,steps:progress.steps,errors:progress.errors})}`);
    console.error(`${progress.phase}: day ${progress.day}, steps ${progress.steps}`);
    await page.waitForTimeout(15000);
  }
  const result=JSON.parse(await page.locator('#report').textContent());
  result.browserErrors=errors;
  await writeFile(output,JSON.stringify(result,null,2)+'\n');
  if(result.errors?.length||errors.length||result.phase!=='complete')
    throw Error(`Music fixture failed: ${JSON.stringify({phase:result.phase,errors:result.errors,browserErrors:errors})}`);
  console.log(JSON.stringify({days:result.requestedDays,steps:result.steps,history:result.history.map(item=>item.pack),
    events:result.events,peakPoolPcmBytes:result.peakPoolPcmBytes,context:result.context}));
}finally{await browser.close();}

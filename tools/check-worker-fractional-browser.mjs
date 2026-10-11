import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [base,outArg,...extra]=process.argv.slice(2);assert(base&&outArg&&!extra.length,'Use BASE_URL FRESH_OUTPUT_DIRECTORY');
const out=resolve(outArg);assert(!existsSync(out),'Refusing to overwrite original browser QA');mkdirSync(out,{recursive:true});
const module=process.env.WG_QA_PLAYWRIGHT_MODULE,{chromium}=await import(module?pathToFileURL(module).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.WG_QA_BROWSER_CHANNEL?{channel:process.env.WG_QA_BROWSER_CHANNEL}:{})});
const rows=[];let page,errors=[];
try{
 for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});page=await context.newPage();errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>errors.push('request-failed '+r.url()+' '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  // Wait for the actual viewer/model readiness, separately from response arrival.
  await page.goto(base+'/tests/browser/worker-fractional-departure.html',{waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>window.qa?.ready,null,{timeout:120000});
  await page.screenshot({path:join(out,`before-${viewport.width}x${viewport.height}.png`)});
  await page.locator('#run').click();await page.waitForFunction(()=>window.qa.progress().steps>=100,null,{timeout:30000});
  await page.locator('#reload').click();
  await page.waitForFunction(()=>window.qa.progress().reached||window.qa.progress().steps>=1200,null,{timeout:90000});
  const result=await page.evaluate(()=>window.qa.report());assert.equal(result.reached,true);assert.equal(result.reloads,1);assert.equal(result.domainUnchanged,true);assert(result.maximumStep<=.24000001);
  assert.deepEqual(result.errors,[]);assert.deepEqual(errors,[]);
  await page.screenshot({path:join(out,`returned-${viewport.width}x${viewport.height}.png`)});
  await page.locator('#overview').click();await page.screenshot({path:join(out,`overview-${viewport.width}x${viewport.height}.png`)});
  rows.push({viewport,result,errors});await context.close();page=null;
 }
 writeFileSync(join(out,'report.json'),JSON.stringify({status:'passed',rows,scope:'Native archived-copy movement, original worker/wall models and procedural terrain, transparent building collision proxies. Desktop headless Chrome viewports, not physical Android, complete game render or economic campaign acceptance.'},null,2)+'\n');
 console.log(JSON.stringify({status:'passed',viewports:rows.length}));
}catch(error){
 if(page)try{await page.screenshot({path:join(out,'failure.png'),timeout:5000});}catch{}
 writeFileSync(join(out,'failure-report.json'),JSON.stringify({status:'failed',message:error.message,errors,rows},null,2)+'\n');throw error;
}finally{await browser.close();}

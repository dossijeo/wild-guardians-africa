import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const [base='http://127.0.0.1:5203',outArg='docs/qa/worker-gate-tutorial-fixes/browser']=process.argv.slice(2),out=resolve(outArg);
if(existsSync(join(out,'report.json')))throw Error('Refusing to overwrite QA report');mkdirSync(out,{recursive:true});
const module=process.env.WG_QA_PLAYWRIGHT_MODULE;
const {chromium}=await import(module?pathToFileURL(module).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.WG_QA_BROWSER_CHANNEL?{channel:process.env.WG_QA_BROWSER_CHANNEL}:{})});
const rows=[];
try{
 for(const viewport of [{width:1280,height:720},{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.goto(base+'/tests/browser/worker-gate-closure-return.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.qa?.ready,{timeout:120000});
  await page.locator('#close').click();await page.locator('#reload').click();
  if(viewport.width===1280)await page.screenshot({path:join(out,'closed-worker-inside.png')});
  await page.locator('#return').click();const returned=await page.evaluate(()=>window.qa.report());
  assert.equal(returned.status,'home');assert.equal(returned.crossed,true);assert.equal(returned.gates,1);assert.deepEqual(returned.errors,[]);
  await page.screenshot({path:join(out,`returned-${viewport.width}x${viewport.height}.png`)});
  await page.locator('#tutorial').click();await page.screenshot({path:join(out,`guardian-${viewport.width}x${viewport.height}.png`)});
  const before=await page.evaluate(()=>window.qa.report());assert.equal(before.voiceActive,true);assert.equal(before.reading,'basic.introduction');
  await page.locator('#open-panel').click();await page.locator('#close-panel').click();
  const interrupted=await page.evaluate(()=>window.qa.report());assert.equal(interrupted.voiceActive,false);assert(interrupted.shownToday.ids.includes('basic.introduction'));assert.notEqual(interrupted.reading,'basic.introduction');
  for(let i=0;i<4;i++){await page.locator('#tutorial').click();await page.locator('#open-panel').click();await page.locator('#close-panel').click();}
  const final=await page.evaluate(()=>window.qa.report());assert.equal(final.voicePlays,2,'Only introduction and center; repeated opening never restarts them');assert.deepEqual(errors,[]);assert.deepEqual(final.errors,[]);
  rows.push({viewport,returned,before,interrupted,final,errors});await context.close();
 }
 writeFileSync(join(out,'report.json'),JSON.stringify({status:'passed',rows,scope:'Native flat-world paid closure and original 3D assets; real DOM guardian with deterministic media edge, not physical device or real voice playback'},null,2)+'\n');
 console.log(JSON.stringify({status:'passed',viewports:rows.length}));
}catch(error){writeFileSync(join(out,'failure-report.json'),JSON.stringify({status:'failed',message:error.message,rows},null,2)+'\n');throw error;}finally{await browser.close();}

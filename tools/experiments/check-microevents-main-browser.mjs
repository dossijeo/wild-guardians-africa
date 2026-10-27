import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('WG_QA_PLAYWRIGHT_MODULE is required');
const {chromium}=await import(pathToFileURL(modulePath).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.WG_QA_URL??'http://127.0.0.1:5221';
const out=process.argv[2]??'test-results/microevents-main-browser';
mkdirSync(out,{recursive:true});
const rows=[];

async function run(fixture,event){
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const errors=[],missing=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('response',response=>{if(response.status()>=400)missing.push({status:response.status(),url:response.url()});});
  try{
    await page.goto(`${base}/?qa-microevents&qa-microevents-fixture=${fixture}`,{waitUntil:'domcontentloaded',timeout:180000});
    await page.waitForFunction(()=>!!window.__microevents,null,{timeout:120000});
    const initial=await page.evaluate(async()=>{
      const c=window.__microevents;await c.billboards.ready;
      window.__microeventSoundTrace=[];
      const original=c.sound;
      c.sound=async id=>{const source=await original(id);window.__microeventSoundTrace.push({id,played:!!source});return source;};
      return {renderer:c.diagnostic?.dataset.renderer,blocked:c.blocked(),anchorCount:(c.updateAnchors(),c.anchors.length)};
    });
    const forced=await page.evaluate(async id=>{const c=window.__microevents;c.cancel('qa');c.state.time=id==='fireflies'?310:100;return c.force(id);},event);
    if(!forced)throw Error(`${fixture}/${event}: no valid anchor`);
    await page.waitForTimeout(600);
    const animation=await page.evaluate(()=>{const c=window.__microevents;return {instances:c.billboards.count,positions:c.particles.pool.slice(0,Math.min(4,c.particles.count)).map(p=>[p.x,p.y,p.phase]),frameSamples:[...c.frameSamples]};});
    await page.screenshot({path:`${out}/${fixture}-${event}.png`});
    await page.getByText('QA Primary interaction',{exact:true}).click();
    await page.waitForFunction(()=>!!document.querySelector('[aria-label="QA Gesture result"]')?.dataset.report,null,{timeout:20000});
    const final=await page.evaluate(()=>({gesture:JSON.parse(document.querySelector('[aria-label="QA Gesture result"]').dataset.report),sounds:window.__microeventSoundTrace,metrics:window.__microevents.metrics}));
    rows.push({fixture,event,initial,forced,animation,final,errors,missing});
  }catch(error){rows.push({fixture,event,error:String(error),errors,missing,body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,500)});}
  finally{await page.close();}
}

try{
  for(const [fixture,event] of [['wood','termites'],['wet','fireflies'],['rocks','fallingdebris']])await run(fixture,event);
}finally{await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows.map(({fixture,event,error,initial,animation,final,errors,missing})=>({fixture,event,error,renderer:initial?.renderer,instances:animation?.instances,gesture:final?.gesture,sounds:final?.sounds,errors,missing}))));
if(rows.some(row=>row.error||row.errors.length||!row.final?.gesture?.completed||!row.animation?.instances))process.exitCode=1;

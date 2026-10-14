import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to a local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const mode=process.argv[2]==='legacy'?'legacy':'spatial';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900}});
await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',
  JSON.stringify({quality:'media',farVegetation:false})));
const errors=[],started=performance.now();
page.on('pageerror',error=>errors.push(String(error)));
page.on('response',response=>{
  if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);
});
let report;
try{
  await page.goto(`${base}/?qa-seed=712${mode==='spatial'?'&qa-spatial-world':''}`);
  await page.waitForSelector('#native-menu',{timeout:30000});
  const source=page.frames().find(frame=>frame.url().includes('/menu/'));
  if(!source)throw Error('Native menu iframe was not ready');
  await source.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',
    action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));
  await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')||
    document.querySelector('.loading-failure'),null,{timeout:120000});
  const state=await page.evaluate(()=>({
    stageReady:Boolean(document.querySelector('#stage[aria-busy="false"]')),
    failure:document.querySelector('.loading-failure')?.textContent??null,
    canvas:Boolean(document.querySelector('#stage canvas#world')),
    hud:Boolean(document.querySelector('#stage #toolbar')),
    authority:globalThis.wildGuardiansSpatialQa?.()??null}));
  report={mode,seed:712,...state,elapsedMs:performance.now()-started,errors};
  if(!state.stageReady||errors.length||mode==='spatial'&&
    (!state.authority?.fieldShared||!state.authority?.streamShared||
      state.authority.nativeChunks<1||
      state.authority.nativeChunks!==state.authority.totalChunks)||
    mode==='legacy'&&state.authority)throw Error(JSON.stringify(report));
  const folder='docs/qa/hierarchical-navigation/screenshots';
  await mkdir(folder,{recursive:true});
  await page.screenshot({path:`${folder}/sabana-seed-712-${mode}-game-start-1600x900.png`});
  await writeFile(`${folder}/${mode}-game-start-report.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}catch(error){
  console.error(JSON.stringify({report,error:String(error),errors,
    pageText:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1200)}));
  process.exitCode=1;
}finally{await browser.close();}

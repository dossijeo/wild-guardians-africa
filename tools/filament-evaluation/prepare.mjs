import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to playwright/index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_FILAMENT_URL??'http://127.0.0.1:5296';
const output=new URL('./vendor/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage();
  page.on('pageerror',error=>console.error(error.message));
  await page.goto(`${base}/tools/filament-evaluation/fixture-smoke.html`);
  await page.waitForFunction(()=>window.fixtureSmoke?.done,null,{timeout:180000});
  const report=await page.evaluate(()=>window.fixtureSmoke);
  if(report.errors.length)throw Error(JSON.stringify(report.errors));
  for(const fixture of report.results){
    const encoded=await page.evaluate(scenario=>{const bytes=new Uint8Array(window.fixtureExports[scenario]);let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text)},fixture.scenario);
    await writeFile(new URL(`world-${fixture.scenario}.glb`,output),Buffer.from(encoded,'base64'));
    await writeFile(new URL(`fixture-${fixture.scenario}.json`,output),JSON.stringify(fixture,null,2)+'\n');
    console.log(JSON.stringify({scenario:fixture.scenario,bytes:fixture.bytes,loadMs:fixture.loadMs,exportMs:fixture.exportMs,static:fixture.static,actors:fixture.actors}));
  }
}finally{await browser.close()}

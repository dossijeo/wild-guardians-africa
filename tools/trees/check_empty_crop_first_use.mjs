import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const out='docs/lighting/tree-near-retexture/performance/empty-crop-first-use'+(process.env.RUN_SUFFIX??'');fs.mkdirSync(out,{recursive:true});
try{
 for(const [index,candidate] of [false,true,true,false].entries()){
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];let variantLoads=0;page.on('pageerror',e=>errors.push(String(e)));
  if(candidate)await page.route('**/src/rendering/loading-textures.js*',async route=>{const response=await route.fetch(),source=await response.text(),needle='if(object.isInstancedMesh&&object.count===0)return;';if(!source.includes(needle))throw Error('Texture selection hook changed');variantLoads++;await route.fulfill({response,body:source.replace(needle,'if(object.isInstancedMesh&&object.count===0){for(let p=object;p;p=p.parent)if(!p.visible)return;}')});});
  await page.goto('http://127.0.0.1:5175/tests/browser/interactive-loading-first-crops.html?biome=sabana&culture=mapungubwe&quality=media');
  await page.waitForSelector('#run[data-ready=true]');await page.locator('#run').click();
  await page.waitForFunction(()=>{const r=JSON.parse(document.querySelector('#report').textContent);return r.done||r.errors?.length;},null,{timeout:240000});
  let report=JSON.parse(await page.locator('#report').textContent());if(report.errors.length||!report.done)throw Error(JSON.stringify({index,errors,report:report.errors}));
  await page.locator('#qa-center').click();
  for(const id of ['qa-maize','qa-millet']){await page.locator('#'+id).click();await page.waitForFunction(id=>{const r=JSON.parse(document.querySelector('#report').textContent);return r.errors?.length||r.postLoadingActions?.some(a=>a.species===(id==='qa-maize'?'maiz':'mijo')&&a.frameSummary);},id,{timeout:30000});}
  report=JSON.parse(await page.locator('#report').textContent());const actions=report.postLoadingActions.filter(a=>a.action==='paid-first-crop');
  fs.writeFileSync(`${out}/${index}.json`,JSON.stringify({candidate,variantLoads,errors,report},null,2));
  if(errors.length||report.errors.length||candidate&&variantLoads!==1||actions.length!==2||actions.some(a=>a.plantsAdded<1))throw Error(`Invalid crop run ${index}`);
  console.log(JSON.stringify({index,candidate,variantLoads,loading:report.frameSummary,resources:report.stages.find(s=>s.stage==='controls-ready')?.resources,actions:actions.map(a=>({species:a.species,drawMs:a.drawMs,commandMs:a.commandMs,frameSummary:a.frameSummary}))}));await page.close();
 }
}finally{await browser.close();}

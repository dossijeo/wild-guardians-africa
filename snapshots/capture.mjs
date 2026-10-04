import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11']});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
try{
 const reports=[];
 for(const index of process.argv.slice(2).length?process.argv.slice(2).map(Number):Array.from({length:15},(_,i)=>i)){
  const page=await context.newPage();page.on('pageerror',e=>console.error('PAGE',e.message));
  await page.goto(`http://127.0.0.1:5178/snapshots/studio.html?shot=${index}`);
  await page.waitForFunction(()=>window.ready||window.errors?.length,{},{timeout:240000});
  const errors=await page.evaluate(()=>window.errors);if(errors.length)throw Error(JSON.stringify(errors));
  const info=await page.evaluate(()=>{studio.world.render(0);return captureInfo();});
  if(info.errors.length)throw Error(JSON.stringify(info.errors));
  await page.screenshot({path:`snapshots/${info.name}.png`});reports.push(info);
  await writeFile(`snapshots/${info.name}.json`,JSON.stringify(info,null,2)+'\n');
  console.log(JSON.stringify(info));await page.close();
 }
}finally{await browser.close();}

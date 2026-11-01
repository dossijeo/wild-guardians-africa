import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright');
const inventory=JSON.parse(fs.readFileSync('docs/lighting/tree-near-retexture/donor-inventory.json'));
const out=process.env.REVIEW_OUT??'docs/lighting/tree-near-retexture/views';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL??'msedge',headless:true});
const report=[];
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}});
 let errors=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
 for(const row of inventory.assets)for(const [view,angle]of [['front',0],['rear',Math.PI]]){
  if(process.env.REVIEW_FILTER&&!process.env.REVIEW_FILTER.split(',').includes(`${row.biome}/${row.slot}`))continue;
  errors=[];
  await page.goto(`http://127.0.0.1:${process.env.REVIEW_PORT??5174}/tests/browser/tree-near-review.html?biome=${row.biome}&slot=${row.slot}&angle=${angle}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.review,{timeout:60000});
  const state=await page.evaluate(()=>({ready:window.review.ready,error:window.review.error,size:window.review.size,distance:window.review.distance}));
  if(!state.ready||errors.length)throw Error(JSON.stringify({row,view,state,errors}));
  // Wait two rendered frames, rather than capturing the pre-render ready flag.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const file=`${row.biome}-${row.slot}-${view}.png`;await page.screenshot({path:`${out}/${file}`});
  report.push({biome:row.biome,slot:row.slot,view,file,...state,errors});
  fs.writeFileSync(`${out}/capture-report.json`,JSON.stringify(report,null,2)+'\n');
  console.log(file);
 }
}finally{await browser.close();}

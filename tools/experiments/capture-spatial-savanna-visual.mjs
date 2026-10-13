import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to the local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const url=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const out='docs/qa/hierarchical-navigation/screenshots';
const suffix=process.env.WG_QA_SUFFIX?`-${process.env.WG_QA_SUFFIX}`:'';
const ground=process.env.WG_QA_GROUND==='game'?'&ground=game':'';
const water=process.env.WG_QA_WATER==='game'?'&water=game':'';
const settlement=process.env.WG_QA_SETTLEMENT==='1'?'&settlement=1':'';
const biome=process.env.WG_QA_BIOME==='desert'?'desert':'savanna';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const records=[];
try{
  for(const seed of [712,28]){
    const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(`${url}/tests/browser/spatial-savanna-visual-compare.html?seed=${seed}&biome=${biome}${ground}${water}${settlement}`);
    await page.waitForFunction(()=>window.qaReady||window.qaError,{timeout:120000});
    const result=await page.evaluate(()=>({stats:window.qaStats,error:window.qaError??null}));
    if(result.error||errors.length)throw Error(JSON.stringify({seed,...result,errors}));
    const file=`${out}/${biome==='desert'?'desierto':'sabana'}-seed-${seed}-js-vs-wasm${suffix}-1600x900.png`;
    await page.screenshot({path:file});
    records.push({seed,file,stats:result.stats,errors});
    await page.close();
  }
}finally{await browser.close();}
await writeFile(`${out}/capture-report${suffix}.json`,JSON.stringify({url,records},null,2)+'\n');
console.log(JSON.stringify(records));

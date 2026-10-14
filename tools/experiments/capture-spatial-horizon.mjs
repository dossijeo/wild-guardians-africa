import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to the local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const output='docs/qa/hierarchical-navigation/screenshots';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,
  ...(process.env.WG_QA_CHROME_PATH?{executablePath:process.env.WG_QA_CHROME_PATH}:{})});
const records=[];
try{
  for(const biome of ['canyons','desert']){
    const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
    await page.goto(`${base}/tests/browser/spatial-horizon-visual.html?biome=${biome}&seed=712`);
    await page.waitForFunction(()=>window.qaReady||window.qaError,{timeout:120000});
    const result=await page.evaluate(()=>({stats:window.qaStats,error:window.qaError??null}));
    if(result.error||errors.length)throw Error(JSON.stringify({biome,...result,errors}));
    const file=`${output}/${biome}-seed-712-native-horizon-1600x900.png`;
    await page.screenshot({path:file});
    records.push({biome,file,...result,errors});
    await page.close();
  }
}finally{await browser.close();}
await writeFile(`${output}/native-horizon-capture-report.json`,JSON.stringify({base,records},null,2)+'\n');
console.log(JSON.stringify(records));

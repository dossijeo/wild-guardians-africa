import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to the local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const browser=await chromium.launch({headless:true,
  ...(process.env.WG_QA_CHROME_PATH?{executablePath:process.env.WG_QA_CHROME_PATH}:{})});
let result;
try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(`${base}/tests/browser/spatial-horizon-worker.html`);
  await page.waitForFunction(()=>window.qaReady||window.qaError,{timeout:120000});
  result=await page.evaluate(()=>({report:window.qaReport??null,error:window.qaError??null}));
  if(result.error||errors.length)throw Error(JSON.stringify({...result,errors}));
  result={base,...result,errors};
}finally{await browser.close();}
await writeFile('docs/qa/hierarchical-navigation/spatial-horizon-worker-browser.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));

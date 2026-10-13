import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
if(!modulePath)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to the local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(modulePath).href);
const base=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const sceneFormat=process.env.WG_QA_FORMAT==='scene',settlement=process.env.WG_QA_SETTLEMENT==='1';
const multiple=process.env.WG_QA_MULTIPLE==='1';
const biome=['savanna','desert','grand_river','volcanoes','mangrove'].includes(process.env.WG_QA_BIOME)?
  process.env.WG_QA_BIOME:'savanna';
const output=process.env.WG_QA_OUTPUT??(sceneFormat?'docs/qa/hierarchical-navigation/spatial-scene-payload-worker-transfer.json':
  'docs/qa/hierarchical-navigation/spatial-ground-mask-transfer.json');
const browser=await chromium.launch({headless:true,
  ...(process.env.WG_QA_CHROME_PATH?{executablePath:process.env.WG_QA_CHROME_PATH}:{})});
try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${base}/tests/browser/spatial-savanna-transfer.html?seed=712&biome=${biome}${sceneFormat?'&format=scene':''}${settlement?'&settlement=1':''}${multiple?'&multi=1':''}`);
  await page.waitForFunction(()=>window.qaReady||window.qaError,{timeout:120000});
  const report=await page.evaluate(()=>({stats:window.qaStats??null,error:window.qaError??null}));
  if(report.error||errors.length)throw Error(JSON.stringify({report,errors}));
  await mkdir('docs/qa/hierarchical-navigation',{recursive:true});
  await writeFile(output,JSON.stringify({report,errors},null,2)+'\n');
  console.log(JSON.stringify({checks:report.stats.checks,current:report.stats.current,
    spatial:report.stats.spatial.map(({roundtripMs,transferBytes,three})=>({roundtripMs,transferBytes,three}))}));
}finally{await browser.close();}

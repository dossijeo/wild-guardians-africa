import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(resolve(process.env.PLAYWRIGHT_MODULE??'.cache/microevent-qa/node_modules/playwright-core'));
const benchmark=process.argv.includes('--benchmark'),output=process.env.OUTPUT??`.cache/remote-image-${benchmark?'costs':'pixels'}.json`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto((process.env.BASE_URL??'http://127.0.0.1:5218')+'/tests/browser/remote-image-regions.html');
 await page.waitForFunction(()=>typeof window.runRemoteImageRegions==='function');
 const result=await page.evaluate(benchmark=>benchmark?window.measureRemoteImageRegions():window.runRemoteImageRegions(),benchmark);
 const receipt={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),mode:benchmark?'native-upload-cost':'production-transport-pixel-parity',browser:browser.version(),at:new Date().toISOString(),result};
 mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({output,...result}));
}finally{await browser.close();}

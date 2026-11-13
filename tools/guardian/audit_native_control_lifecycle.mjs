import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[],httpFailures=[],consoleErrors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('response',response=>{if(response.status()>=400)httpFailures.push({url:response.url(),status:response.status()});});
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5181')+'/tests/browser/native-world-mutations.html');
 await page.waitForFunction(()=>typeof window.runNativeControlLifecycleAudit==='function');
 const result=await page.evaluate(()=>window.runNativeControlLifecycleAudit());
 if(errors.length||httpFailures.some(f=>!f.url.endsWith('/favicon.ico')))throw Error(JSON.stringify({errors,httpFailures}));
 if(!result.adapter.vendor||/swiftshader|software/i.test(JSON.stringify(result.adapter))||result.block.afterRetirementFrames!==0||!result.deviceLoss.drained||
    !result.silentChannel.worldUnchanged||!result.silentChannel.closed)throw Error('Unexpected native lifecycle evidence');
 const receipt={result,errors,httpFailures,consoleErrors};
 await writeFile(process.env.OUTPUT??'docs/guardian/performance/native-control-lifecycle-20261113.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}finally{await browser.close();}

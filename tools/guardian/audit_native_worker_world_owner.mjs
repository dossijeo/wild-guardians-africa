import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),output=process.env.OUTPUT??'docs/guardian/performance/native-worker-world-owner-20261114.json';
let timer;
try{
 const page=await browser.newPage(),errors=[],httpFailures=[],consoleErrors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))httpFailures.push({url:response.url(),status:response.status()});});
 await page.exposeFunction('nativeWorkerWorldCheckpoint',()=>page.locator('#native-worker-world').screenshot({path:output.replace(/\.json$/,'.png')}));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5181')+'/tests/browser/native-worker-world-owner.html');await page.waitForFunction(()=>typeof window.runNativeWorkerWorldOwner==='function');
 const result=await Promise.race([page.evaluate(()=>window.runNativeWorkerWorldOwner()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Native worker product owner audit timed out')),120000);})]);
 if(errors.length||consoleErrors.length||httpFailures.length||/swiftshader|software/i.test(JSON.stringify(result.adapter))||!result.adapter.vendor||result.final.gpuErrors)throw Error(JSON.stringify({errors,consoleErrors,httpFailures,result}));
 await writeFile(output,JSON.stringify({result,errors,consoleErrors,httpFailures},null,2)+'\n');console.log(JSON.stringify({output,adapter:result.adapter,before:result.before.resourcesCreated,afterReuse:result.afterReuse.resourcesCreated,block:result.block,reused:result.reused.reused,replaced:result.replacement.nativeRoute.assignmentSequence,errors}));
}finally{clearTimeout(timer);await browser.close();}

import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),output=process.env.OUTPUT??'.cache/native-first-task-world-owner.json';
let timer;
try{
 const page=await browser.newPage(),errors=[],consoleErrors=[],httpFailures=[],requestFailures=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());else if(message.text().startsWith('first-task-stage:'))console.log(message.text());});
 page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))httpFailures.push({url:response.url(),status:response.status()});});
 page.on('requestfailed',request=>requestFailures.push({url:request.url(),failure:request.failure()}));
 await page.exposeFunction('nativeFirstTaskCheckpoint',label=>page.locator('#native-first-task').screenshot({path:output.replace(/\.json$/,`-${label}.png`)}));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5181')+'/tests/browser/native-first-task-world-owner.html');
 await page.waitForFunction(()=>typeof window.runNativeFirstTaskWorldOwner==='function');
 let result;
 try{result=await Promise.race([page.evaluate(()=>window.runNativeFirstTaskWorldOwner()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('First-task owner audit timed out')),120000);})]);}
 catch(error){await writeFile(output,JSON.stringify({error:String(error),errors,consoleErrors,httpFailures,requestFailures},null,2)+'\n');throw error;}
 await writeFile(output,JSON.stringify({result,errors,consoleErrors,httpFailures,requestFailures},null,2)+'\n');
 if(errors.length||consoleErrors.length||httpFailures.length||requestFailures.length||/swiftshader|software/i.test(JSON.stringify(result.adapter))||!result.adapter.vendor||result.final.gpuErrors||result.drained!==true)throw Error(JSON.stringify({errors,consoleErrors,httpFailures,requestFailures,result}));
 console.log(JSON.stringify({output,adapter:result.adapter,block:result.block,errors}));
}finally{clearTimeout(timer);await browser.close();}

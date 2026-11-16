import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),output=process.env.OUTPUT??'.cache/native-first-task-world-owner.json';
let timer;
try{
 const page=await browser.newPage(),errors=[],consoleErrors=[],httpFailures=[],requestFailures=[],rejectAdoption=process.env.QA_NATIVE_SETTLEMENT_REJECT_ADOPTION==='true';let adoptionControlMatches=0;
 if(rejectAdoption)await page.context().route('**/src/rendering/webgpu-world-surface.js*',async route=>{
  const response=await route.fetch(),body=await response.text(),pattern=/if\s*\(nativeGateProposal\?\.descriptor\.phase\s*===\s*['"]adopting['"]\)\s*await waitNativePublication\(minSequence,\s*callerSignal\s*\?\?\s*new AbortController\(\)\.signal,\s*\(\)\s*=>\s*!nativeGateProposal\);/g;
  const modified=body.replace(pattern,()=>{adoptionControlMatches++;return "if(nativeGateProposal?.descriptor.phase==='adopting')throw Error('Native gate resource surface unavailable (adoption negative control)');";});
  await route.fulfill({response,body:modified});
 });
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());else if(message.text().startsWith('first-task-stage:'))console.log(message.text());});
 page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))httpFailures.push({url:response.url(),status:response.status()});});
 page.on('requestfailed',request=>requestFailures.push({url:request.url(),failure:request.failure()}));
 await page.exposeFunction('nativeFirstTaskCheckpoint',label=>page.locator('#native-first-task').screenshot({path:output.replace(/\.json$/,`-${label}.png`)}));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5181')+'/tests/browser/native-first-task-world-owner.html');
 await page.waitForFunction(()=>typeof window.runNativeFirstTaskWorldOwner==='function');
 let result;
 try{result=await Promise.race([page.evaluate(options=>window.runNativeFirstTaskWorldOwner(options),{action:process.env.QA_NATIVE_ACTION==='true',restore:process.env.QA_NATIVE_ACTION_RESTORE==='true',consequence:process.env.QA_NATIVE_CONSEQUENCE==='true',settlement:process.env.QA_NATIVE_SETTLEMENT==='true',settlementHome:process.env.QA_NATIVE_SETTLEMENT_HOME==='true',homeRoute:process.env.QA_NATIVE_HOME_ROUTE==='true',homeArrival:process.env.QA_NATIVE_HOME_ARRIVAL==='true',homeRestore:process.env.QA_NATIVE_HOME_RESTORE==='true',idleHome:process.env.QA_NATIVE_IDLE_HOME==='true',initialIdleBody:process.env.QA_NATIVE_INITIAL_IDLE_BODY==='true',initialIdleMode:process.env.QA_NATIVE_INITIAL_IDLE_MODE??'watch',initialIdleHome:process.env.QA_NATIVE_INITIAL_IDLE_HOME==='true',initialIdleCycle:process.env.QA_NATIVE_IDLE_CYCLE==='true',initialIdleCycleRepeat:process.env.QA_NATIVE_IDLE_CYCLE_REPEAT==='true',initialIdleCycleHome:process.env.QA_NATIVE_IDLE_CYCLE_HOME==='true',initialIdleCycleStroll:process.env.QA_NATIVE_IDLE_CYCLE_STROLL==='true'}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('First-task owner audit timed out')),120000);})]);}
 catch(error){const partial=await page.evaluate(()=>window.nativeFirstTaskFailureReceipt??null).catch(()=>null);await writeFile(output,JSON.stringify({error:String(error),...(partial?{partial}:{}),errors,consoleErrors,httpFailures,requestFailures,...(rejectAdoption?{adoptionControlMatches}:{})},null,2)+'\n');throw error;}
 if(rejectAdoption)throw Error('Adoption negative control unexpectedly passed; replacements: '+adoptionControlMatches);
 await writeFile(output,JSON.stringify({result,errors,consoleErrors,httpFailures,requestFailures},null,2)+'\n');
 if(result.errors?.length||result.cycle?.errors?.length||errors.length||consoleErrors.length||httpFailures.length||requestFailures.length||/swiftshader|software/i.test(JSON.stringify(result.adapter))||!result.adapter.vendor||result.final.gpuErrors||result.drained!==true)throw Error(JSON.stringify({errors,consoleErrors,httpFailures,requestFailures,result}));
 const active=result.cycle?.stroll?result.cycle.records.at(-1):result.settlement?.homeRoute?.arrival??result.settlement?.homeRoute??result.settlement??result.consequence??result.action??result.homeRoute??result;console.log(JSON.stringify({output,adapter:result.adapter,scope:result.cycle?.stroll?'native Idle stroll':result.initialIdleBody?'native initial '+result.mode:result.settlement?.idleHome?'native Idle to Home':result.homeRestoration?'native Home restoration':result.settlement?.homeRoute?.arrival?'native Home absence':result.settlement?.homeRoute?'native Home route':result.settlement?.pendingHome?'settlement pending Home':result.settlement?'settlement and next task':result.consequence?'Harvest to Carry':result.action?'native action':'first task',block:active.block,...(active.nextTask?{nextTaskBlock:active.nextTask.block}:{}),errors}));
}finally{clearTimeout(timer);await browser.close();}

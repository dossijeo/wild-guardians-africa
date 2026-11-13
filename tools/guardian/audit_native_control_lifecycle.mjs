import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const retained=process.env.QA_AUDIT==='retained-preparations',resources=retained||process.env.QA_AUDIT==='resources';
if(process.env.QA_AUDIT!==undefined&&!resources)throw Error('Unknown native control audit');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[],httpFailures=[],consoleErrors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('response',response=>{if(response.status()>=400)httpFailures.push({url:response.url(),status:response.status()});});
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5181')+'/tests/browser/native-world-mutations.html');
 const fn=retained?'runNativeRetainedPreparationsAudit':resources?'runNativeWorldResourcesAudit':'runNativeControlLifecycleAudit';
 await page.waitForFunction(fn=>typeof window[fn]==='function',fn);
 const result=await page.evaluate(fn=>window[fn](),fn);
 if(errors.length||httpFailures.some(f=>!f.url.endsWith('/favicon.ico')))throw Error(JSON.stringify({errors,httpFailures}));
 if(!result.adapter.vendor||/swiftshader|software/i.test(JSON.stringify(result.adapter)))throw Error('Hardware WebGPU audit required');
 if(retained&&(!result.retainedPreparations||result.retainedPreparations.readback!==123||result.retainedPreparations.resourcesBefore!==result.retainedPreparations.resourcesAfter))throw Error('Original GPU resources were not retained');
 if(resources){if(result.resourceIdentity.latePacket!=='obsolete'||result.resourceIdentity.freshPacket!=='presented')throw Error('Unexpected resource identity evidence');}
 else if(result.block.afterRetirementFrames!==0||!result.deviceLoss.drained||!result.silentChannel.worldUnchanged||!result.silentChannel.closed)throw Error('Unexpected native lifecycle evidence');
 const receipt={result,errors,httpFailures,consoleErrors};
 await writeFile(process.env.OUTPUT??`docs/guardian/performance/native-${retained?'retained-preparations':resources?'world-resources':'control-lifecycle'}-20261113.json`,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}finally{await browser.close();}

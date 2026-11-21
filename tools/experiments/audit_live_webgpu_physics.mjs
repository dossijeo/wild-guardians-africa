import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/?qa-worker-game&qa-worker-raid&qa-webgpu-world&qa-webgpu-all-actors&qa-worker-batch=1&wildEngineThreads=0',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q?.animals>0||document.querySelector('.error-banner');},null,{timeout:180000});
 const start=await page.evaluate(()=>({qa:window.wildGuardiansWorkerQa(),failure:document.querySelector('.error-banner')?.textContent}));if(start.failure||!start.qa.status?.running)throw Error(JSON.stringify(start));
 await page.waitForFunction(async()=>{try{const s=await window.wildGuardiansWebGpuWorldQa();return s.backend==='WebGPU'&&s.actors?.ready>=1;}catch{return false;}},null,{timeout:120000});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa().elapsed>=12,null,{timeout:60000});await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="attack"]').click();
 const target='animal-368';await page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),target);
 let observed=false,released=false,maxApplied=0;const phases=new Set(),endAt=Date.now()+90000;
 while(Date.now()<endAt){await page.waitForTimeout(200);const data=await page.evaluate(async id=>({gpu:await window.wildGuardiansWebGpuWorldQa(),game:window.wildGuardiansWorkerCombatQa(),qa:window.wildGuardiansWorkerQa()}),target);if(data.qa.status?.fault)throw Error('Authority fault '+JSON.stringify(data.qa.status));const animal=data.game.animals.find(a=>a.id===target),phase=animal?.down??'released';phases.add(phase);maxApplied=Math.max(maxApplied,data.gpu.actors?.physicalApplied??0);if(data.gpu.actors?.physicalApplied>0)observed=true;if(observed&&phase==='released'&&data.gpu.actors?.physicalApplied===0){released=true;break;}}
 if(!observed||!released||errors.length)throw Error(JSON.stringify({observed,released,maxApplied,phases:[...phases],errors}));console.log(JSON.stringify({backend:'WebGPU',target,physicalApplied:maxApplied,phases:[...phases],released,scope:'Opt-in actual game, direct QA attack on a savanna raid fixture. Tests Worker pose application and release; no visual parity, collision or performance claim.'}));
}finally{await browser.close();}

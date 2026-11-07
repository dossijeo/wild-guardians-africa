import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const bounded=(promise,ms,stage)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`QA ${stage} timed out after ${ms} ms`)),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 console.error('QA stage: navigating');
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/?qa-worker-game&qa-worker-raid&qa-webgpu-world&qa-webgpu-recovery&qa-crop-spell-frame&qa-webgpu-all-actors&qa-worker-diagnostics&qa-worker-batch=1&wildEngineThreads=0',{waitUntil:'domcontentloaded'});
 console.error('QA stage: game boot');
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q?.animals>0||document.querySelector('.error-banner');},null,{timeout:180000});
 console.error('QA stage: WebGPU actors');
 await page.waitForFunction(async()=>{try{const s=await window.wildGuardiansWebGpuWorldQa();return s.backend==='WebGPU'&&s.actors?.ready>=1;}catch{return false;}},null,{timeout:120000});
 const diagnostics=async stage=>{try{const state=await bounded(page.evaluate(async()=>({runtime:window.wildGuardiansWorkerQa?.(),gpu:await Promise.race([window.wildGuardiansWebGpuWorldQa?.().catch(e=>({error:e.message})),new Promise(resolve=>setTimeout(()=>resolve({error:'inspection timed out'}),5000))]),banner:document.querySelector('.error-banner')?.textContent})),10000,'diagnostics');console.error('QA DIAGNOSTICS',JSON.stringify({stage,...state,errors}));}catch(error){console.error('QA DIAGNOSTICS FAILED',stage,String(error),JSON.stringify(errors));}};
 console.error('QA stage: checkpoint');let baseline;try{baseline=await bounded(page.evaluate(()=>window.wildGuardiansRestoreTerrainCheckpointQa()),30000,'checkpoint');}catch(error){await diagnostics('checkpoint-application');throw error;}try{await page.waitForFunction(sequence=>window.wildGuardiansWorkerQa()?.status?.recoveryBaseSequence>=sequence,baseline.sequence,{timeout:10000});}catch(error){await diagnostics('checkpoint-promotion');throw error;}
 console.error('QA stage: event after checkpoint');
 const baselineIds=await page.evaluate(()=>window.wildGuardiansSpatialQa().state.events.map(e=>e.id));
 const expected=await page.waitForFunction(ids=>window.wildGuardiansSpatialQa().state.events.find(e=>!ids.includes(e.id)&&['CropHit','CropDestroyed'].includes(e.type)),baselineIds,{timeout:30000}).then(x=>x.jsonValue());
 console.error('QA stage: reattach');const recovered=await bounded(page.evaluate(()=>window.wildGuardiansReattachWebGpuQa()),60000,'reattach'),after=await bounded(page.evaluate(()=>window.wildGuardiansWebGpuWorldQa()),15000,'inspect'),matches=after.recoveryEvents.filter(e=>e.id===expected.id);
 if(recovered.base!==baseline.sequence||matches.length!==1||new Set(after.recoveryEvents.map(e=>e.id)).size!==after.recoveryEvents.length||errors.length)throw Error('Recovery event mismatch '+JSON.stringify({baseline,expected,recovered,matches,after,errors}));
 console.log(JSON.stringify({base:baseline.sequence,through:recovered.sequence,event:expected.id,eventType:expected.type,replayed:matches.length,events:after.recoveryEvents.length,backend:after.backend,resident:after.resident,scope:'Real QA raid, confirmed crop event after checkpoint replayed once to replacement graphics worker; not device-loss recovery or visual parity.'}));
}finally{await browser.close();}

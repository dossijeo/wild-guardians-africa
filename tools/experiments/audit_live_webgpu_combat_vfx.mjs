import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto((process.env.QA_BASE_URL??'http://127.0.0.1:5175')+'/?qa-worker-game&qa-worker-raid&qa-webgpu-world&qa-webgpu-all-actors&qa-worker-batch=1&wildEngineThreads=0',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const q=window.wildGuardiansWorkerQa?.();return q?.screen==='game'&&q?.animals>0||document.querySelector('.error-banner');},null,{timeout:180000});
 const initial=await page.evaluate(()=>({game:window.wildGuardiansWorkerQa(),failure:document.querySelector('.error-banner')?.textContent}));if(initial.failure||!initial.game.status?.running)throw Error('Raid unavailable '+JSON.stringify(initial));
 let active=null,latest=null;const deadline=Date.now()+120000;while(Date.now()<deadline){latest=await page.evaluate(async()=>({game:window.wildGuardiansWorkerQa(),gpu:await window.wildGuardiansWebGpuWorldQa()}));if(latest.game.status?.fault||latest.gpu.state?.fault||latest.gpu.agricultureVfx?.failure)throw Error('Raid fault '+JSON.stringify(latest));active=latest.gpu.agricultureVfx?.active.find(effect=>effect.family==='combat'&&effect.visible&&effect.sprites>0);if(active)break;await page.waitForTimeout(100);}
 if(!active||errors.length)throw Error('No confirmed combat effect in real raid '+JSON.stringify({latest,errors}));console.log(JSON.stringify({backend:latest.gpu.backend,sequence:latest.gpu.state.sequence,elapsed:latest.game.elapsed,active,actors:latest.gpu.actors,scope:'Actual development raid, state-driven animal attack effect; no visual parity, full effects or performance claim.'}));
}finally{await browser.close();}

import {createRequire} from 'node:module';
import {awakeningState} from '../../src/simulation/awakenings.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.route('**/tests/fixtures/microevent-wood.json',async route=>{const response=await route.fetch(),fixture=await response.json();awakeningState(fixture).progress=100;await route.fulfill({response,json:fixture});});
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&qa-worker-clock&qa-webgpu-world&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});
 const start=await page.evaluate(()=>window.wildGuardiansWorkerAwakeningQa(true));
 if(!start.event?.provisional||start.blessed||start.progress!==100||start.queued!==1)throw Error('Invalid provisional awakening: '+JSON.stringify(start));
 await page.waitForFunction(({id,command})=>{const q=window.wildGuardiansWorkerAwakeningStatusQa(id);return q.blessed&&q.progress===0&&q.queued===0&&q.event?.commandId===command&&!q.event.provisional;},{id:start.targetId,command:start.event.commandId},{timeout:30000});
 const gpu=await page.evaluate(async id=>{const deadline=Date.now()+90000;while(Date.now()<deadline){try{const q=await window.wildGuardiansWebGpuWorldQa();if(q.backend==='WebGPU'&&q.blessingVfx?.sourceIds.includes(id))return q;}catch{}await new Promise(resolve=>setTimeout(resolve,150));}throw Error('Confirmed target blessing did not appear in WebGPU');},start.targetId);
 const end=await page.evaluate(id=>({awakening:window.wildGuardiansWorkerAwakeningStatusQa(id),game:window.wildGuardiansWorkerQa()}),start.targetId);
 if(end.game.status?.fault||errors.length)throw Error(JSON.stringify({end,errors}));
 console.log(JSON.stringify({start,end,gpu:gpu.blessingVfx,scope:'Opt-in Worker game, peaceful fixture with prepared awakening charge, direct input and duplicate command; headless SwiftShader, no visual comparison.'}));
}finally{await browser.close();}

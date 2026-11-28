import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(`${process.env.QA_BASE_URL??'http://127.0.0.1:5175'}/?qa-worker-game&qa-microevents-fixture=wood&qa-worker-clock&qa-worker-coalesce&wildEngineThreads=0`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.wildGuardiansWorkerQa?.().screen==='game',null,{timeout:180000});
 await page.locator('[data-menu="build"]').click();await page.locator('#native-wall').click();await page.locator('[data-wall="empalizada"]').click();
 const start=await page.evaluate(()=>window.wildGuardiansWorkerWallQa([[80,20],[84,20]]));
 if(start.pending.length!==1)throw Error('Missing provisional wall: '+JSON.stringify(start));
 try{await page.waitForFunction(count=>{const q=window.wildGuardiansWorkerWallStatusQa();return q.count>count&&q.pending===0;},start.count,{timeout:30000});}catch{throw Error('Wall not confirmed: '+JSON.stringify(await page.evaluate(()=>({wall:window.wildGuardiansWorkerWallStatusQa(),game:window.wildGuardiansWorkerQa(),text:document.body.innerText.slice(-800)})))+'; '+JSON.stringify(errors));}
 const end=await page.evaluate(()=>({wall:window.wildGuardiansWorkerWallStatusQa(),game:window.wildGuardiansWorkerQa()}));
 if(end.game.status?.fault||errors.length)throw Error(JSON.stringify({end,errors}));
 const rejected=await page.evaluate(()=>window.wildGuardiansWorkerWallQa([[96,7],[100,7]]));
 if(rejected.pending.length!==1)throw Error('Missing second provisional wall: '+JSON.stringify(rejected));
 await page.waitForFunction(()=>window.wildGuardiansWorkerWallStatusQa().pending===0,null,{timeout:30000});
 const final=await page.evaluate(()=>({wall:window.wildGuardiansWorkerWallStatusQa(),game:window.wildGuardiansWorkerQa()}));
 if(final.wall.count!==end.wall.count||final.game.status?.fault||errors.length)throw Error(JSON.stringify({final,errors}));
 console.log(JSON.stringify({start,end,rejected,final,scope:'Opt-in Worker game, peaceful fixture, direct wall strokes; headless SwiftShader, no visual or performance comparison.'}));
}finally{await browser.close();}

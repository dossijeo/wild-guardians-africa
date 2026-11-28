import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/contact-bank-visual.html?frames=1');
 await page.waitForFunction(()=>window.contactBankVisual||window.contactBankVisualError,null,{timeout:360000});
 const {result,error}=await page.evaluate(()=>({result:window.contactBankVisual,error:window.contactBankVisualError}));
 if(error||errors.length||result?.frameAudits?.length!==5||result.frameAudits.some(a=>a.frames.length!==180))throw Error(JSON.stringify({error,errors}));
 delete result.pictures;delete result.videos;
 result.scope='180 explicit 60 Hz time samples per species on one savanna terrain, rendered and read synchronously in Edge. Both sides use the original animated rig and differ only in the support correction. Pixel difference includes silhouettes and shadows; temporal residual is mean absolute difference between the two per-channel frame-to-frame changes. This is not a perceptual score, proof of contact, video, GPU animation, gameplay or a performance measurement.';
 await writeFile(process.env.OUTPUT??'docs/guardian/gpu-animation/contact-bank-frame-audit.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({device:result.device,species:result.frameAudits.map(a=>({species:a.species,frames:a.frames.length}))}));
}finally{await browser.close();}

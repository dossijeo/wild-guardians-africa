import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/contact-bank-visual.html?temporal=1');
 await page.waitForFunction(()=>window.contactBankVisual||window.contactBankVisualError,null,{timeout:240000});
 const {result,error}=await page.evaluate(()=>({result:window.contactBankVisual,error:window.contactBankVisualError}));
 if(error||errors.length||result?.videos?.length!==5)throw Error(JSON.stringify({error,errors}));
 delete result.pictures;
 for(const video of result.videos){
  const decoded=await page.evaluate(async data=>{const v=document.createElement('video');v.muted=true;v.src=data;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('Video decode failed'));});await v.play();await new Promise(resolve=>setTimeout(resolve,250));const out={width:v.videoWidth,height:v.videoHeight,advanced:v.currentTime>.05};v.pause();return out;},video.data);
  if(decoded.width!==1600||decoded.height!==600||!decoded.advanced||video.frames!==90)throw Error('Invalid video '+video.species);
  video.decoded=decoded;await writeFile(`docs/guardian/gpu-animation/contact-bank-${video.species}-comparison.webm`,Buffer.from(video.data.split(',')[1],'base64'));delete video.data;
 }
 result.scope='Synchronized side-by-side recordings, 90 nominal 30 Hz frames per species; same original CPU rig and synthetic root, original versus interpolated baked contact lift on one native savanna terrain. Rendering and encoding are sequential within each frame; no frame-time benchmark, other clips, gameplay, GPU animation, dynamic obstacles or complete visual validation.';
 await writeFile('docs/guardian/gpu-animation/contact-bank-temporal.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
} finally {await browser.close();}

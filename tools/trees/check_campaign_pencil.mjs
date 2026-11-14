import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const dir='docs/lighting/tree-near-retexture/performance/cinematic-pencil';fs.mkdirSync(dir,{recursive:true});
try{
 const results=[];
 for(const mode of ['normal','reduced','missing-guide']){
  const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:mode==='reduced'?'reduce':'no-preference'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  if(mode==='missing-guide')await page.route('**/cinematics/pencil-guides/**',route=>route.abort());
  await page.goto('http://127.0.0.1:5175/tests/browser/campaign-cinematics.html');
  await page.waitForSelector('.campaign-cinema__scene.is-visible',{timeout:60000});
  await page.waitForTimeout(1100);
  const early=await page.evaluate(()=>{const p=window.campaignCinemaQa,canvas=document.querySelector('.campaign-cinema__pencil'),gl=canvas?.getContext('webgl');let pixel=null;if(gl){pixel=new Uint8Array(4);gl.readPixels(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);pixel=[...pixel];}return {error:document.body.dataset.error??null,pencilAvailable:p.pencil?.available??false,progress:p.pencil?.progress??null,visible:canvas?getComputedStyle(canvas).display:null,pixel,background:document.querySelectorAll('.campaign-cinema__background').length,foreground:document.querySelectorAll('.campaign-cinema__scene.is-visible > img').length,caption:document.querySelector('.campaign-cinema__caption')?.textContent};});
  if(mode==='normal'){
   await page.screenshot({path:`${dir}/scene-01-pencil.png`});
   await page.waitForFunction(()=>window.campaignCinemaQa.pencil?.progress>=1,null,{timeout:30000});
   early.late=await page.evaluate(()=>({display:getComputedStyle(document.querySelector('.campaign-cinema__pencil')).display,progress:window.campaignCinemaQa.pencil.progress}));
   await page.screenshot({path:`${dir}/scene-01-complete.png`});
   await page.waitForFunction(()=>[...document.querySelectorAll('.campaign-cinema__scene')].at(-1)?.querySelector('.campaign-cinema__background-image')?.src.includes('scene-02-background'),null,{timeout:30000});
   early.second=await page.evaluate(()=>{const scene=[...document.querySelectorAll('.campaign-cinema__scene')].at(-1),canvas=scene.querySelector('.campaign-cinema__pencil');return {visible:canvas?getComputedStyle(canvas).display:null,foreground:scene.querySelectorAll(':scope > img').length};});
   if(early.second.visible!=='block'||early.second.foreground<1)throw Error(`second scene: ${JSON.stringify(early.second)}`);
   early.contextLoss=await page.evaluate(()=>{const pencil=window.campaignCinemaQa.pencil,extension=pencil.gl.getExtension('WEBGL_lose_context');if(!extension)return 'unsupported';extension.loseContext();return 'requested';});
   if(early.contextLoss==='requested')await page.waitForFunction(()=>!window.campaignCinemaQa.pencil.available&&getComputedStyle(document.querySelector('.campaign-cinema__pencil')).display==='none',null,{timeout:10000});
  }
  await page.locator('.campaign-cinema__skip').click();await page.waitForFunction(()=>document.body.dataset.completed==='true',{timeout:10000});
  early.disposed=await page.evaluate(()=>window.campaignCinemaQa.pencil===null);
  if(errors.length||early.error||!early.caption||early.background!==1||early.foreground<1||!early.disposed)throw Error(`${mode}: ${JSON.stringify({early,errors})}`);
  if(mode==='normal'&&(!early.pencilAvailable||early.visible!=='block'||!early.pixel||early.late.display!=='none'))throw Error(`normal: ${JSON.stringify(early)}`);
  if(mode==='reduced'&&early.pencilAvailable||mode==='missing-guide'&&early.visible!==null)throw Error(`${mode}: ${JSON.stringify(early)}`);
  results.push({mode,...early,errors});await page.close();
 }
 fs.writeFileSync(`${dir}/report.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}

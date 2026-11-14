import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE??'playwright'),sharp=require('sharp');
const out='docs/lighting/tree-near-retexture/performance/vfx-ground-depth-controls';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/vfx.html?groundDepthReview');await page.waitForFunction(()=>window.vfxDepthReview,{timeout:90000});
 await page.addStyleTag({content:'header{display:none!important}'});
 await page.evaluate(()=>{const r=window.vfxDepthReview;r.captureCount=0;const current=r.pipeline.captureDepth;r.pipeline.captureDepth=function(...args){r.captureCount++;return current.apply(this,args);};});
 const results=[];
 for(const [id,age] of [['dust',.65],['dig',.7],['wood',.55],['rhino',2.4],['lion',1.8]]){
  await page.evaluate(({id,age})=>{const r=window.vfxDepthReview;r.choose(id);r.effect.seek(age);},{id,age});
  const images=[],samples=[];
  for(const [index,enabled] of [false,false,true,true].entries()){
   const data=await page.evaluate(enabled=>{const r=window.vfxDepthReview;r.review.enabled=enabled;const before=r.captureCount;r.draw();return {sprites:r.effect.sprites.geometry.instanceCount,captured:r.captureCount-before,softDepth:r.effect.softParticleDepth};},enabled);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const path=`${out}/${id}-${index}-${enabled?'ground':'full'}.png`;await page.screenshot({path});images.push(await sharp(path).ensureAlpha().raw().toBuffer());samples.push({enabled,...data});
  }
  const diff=(a,b)=>{let pixels=0,max=0;for(let i=0;i<a.length;i+=4){let d=0;for(let j=0;j<3;j++)d=Math.max(d,Math.abs(a[i+j]-b[i+j]));if(d){pixels++;max=Math.max(max,d);}}return {pixels,max};};
  results.push({id,age,samples,control:diff(images[0],images[1]),candidate:diff(images[1],images[2]),groundControl:diff(images[2],images[3])});
 }
 fs.writeFileSync(`${out}/proof.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();}

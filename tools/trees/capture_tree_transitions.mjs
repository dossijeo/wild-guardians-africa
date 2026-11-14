import fs from 'node:fs';import {createRequire} from 'node:module';
import {approvedVisualSearch} from '../../src/rendering/approved-visual-profile.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const out='docs/lighting/tree-near-retexture/transitions';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const biome of (process.env.REVIEW_BIOMES??'sabana,gran-rio,manglares,volcanes,gran-canon').split(',')){
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[],records=[];
  page.on('pageerror',e=>errors.push(e.stack??String(e)));
  await page.goto('http://127.0.0.1:5175/tests/browser/far-biome-world.html?'+approvedVisualSearch(biome,`biome=${biome}&quality=media&far-profile=integrated&treeReview`),{waitUntil:'domcontentloaded'});
  console.log('transitions',biome,'loading');
  await page.waitForFunction(()=>window.treeReview?.report?.loaded,null,{timeout:420000});
  await page.addStyleTag({content:'header,body>button{display:none!important}'});
  const target=await page.evaluate(()=>{
   const w=window.treeReview.world;
   const choices=[...w.chunks.values()].flatMap(g=>(g.userData.lodBatches??[]).filter(b=>b.slot===0&&b.prototype.nearTextureDistance).flatMap(b=>b.instances.map(p=>({p,centerY:b.prototype.centerY,size:b.prototype.size,d:Math.hypot(p.x-w.camera.position.x,p.z-w.camera.position.z)})))).sort((a,b)=>a.d-b.d);
   if(!choices.length)throw Error('No target tree');const t=choices[0];window.reviewTarget=t;
   w.setCameraExclusion(false);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};return t;
  });
  for(const [phase,distances]of [['day',[16,18,22,26,29,90,110,140,250]],['night',[16,110]]]){
   await page.locator('#phase').selectOption(phase,{force:true});
   for(const distance of distances){
    const capture=await page.evaluate(async distance=>{
     const w=window.treeReview.world,{p,centerY,size}=window.reviewTarget;
     const radius=Math.max(size[0]*p.sx,size[2]*p.sz)*.25;
     w.controls.target.set(p.x,p.y+centerY*p.sy,p.z);
     const direction=w.camera.position.clone().set(.7,.22,.7).normalize();w.camera.position.copy(w.controls.target).addScaledVector(direction,distance+radius);
     w.syncChunks();await w.whenChunksReady();await w.horizon?.whenReady();
     for(let i=0;i<90;i++)await new Promise(resolve=>requestAnimationFrame(resolve));
     const occurrences=[];
     for(const g of w.chunks.values())for(const b of g.userData.lodBatches??[]){const index=b.instances.findIndex(t=>t.id===p.id);if(index>=0)occurrences.push({slot:b.slot,levels:b.orders.map((order,level)=>({level,present:order.includes(index),count:b.meshes[level].count})),fade:b.fade?.attribute.getX(index)});}
     const a=window.treeReview.adapter.adapters.find(a=>a.layer.options.slot===p.slot);
     return {distance,position:w.camera.position.toArray(),target:w.controls.target.toArray(),renderOrigin:[w.renderOrigin.x,w.renderOrigin.z],occurrences,farTree:a?.layer.current?.prototype.treeState(p.id),farDiagnosis:a?.readinessDiagnosis(p.id),report:window.treeReview.report,errors:window.treeReview.errors};
    },distance);
    records.push({phase,...capture});
    await page.screenshot({path:`${out}/${biome}-${phase}-${distance}.png`});
    fs.writeFileSync(`${out}/${biome}.json`,JSON.stringify({target,records,errors},null,2)+'\n');
    if(errors.length||capture.errors.length||capture.report.errors.length)throw Error('Tree transition review has runtime errors');
    console.log('transitions',biome,phase,distance,'done');
   }
  }
  await page.close();
 }
}finally{await browser.close();}

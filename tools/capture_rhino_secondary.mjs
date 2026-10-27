import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const {chromium}=createRequire(import.meta.url)('playwright'),base=process.env.WG_QA_URL??'http://127.0.0.1:5194',out='docs/qa/rhino-replacement';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],records=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/tests/browser/beast-replacement.html?species=rhino&biome=sabana`,{waitUntil:'commit'});await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});assert(await page.evaluate(()=>beastQA.ready));
 for(const clip of ['Walking','Running','Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2'])for(const phase of [.2,.5,.8]){
  const frame=await page.evaluate(async({clip,phase})=>{
   const q=beastQA,w=q.world;q.state.time=150;await q.setView('back',4.8,1.6);q.pose(clip,phase);
   const [x,y,z]=q.capture().position;w.controls.target.set(x,y+1.3,z);w.camera.position.y=y+1.6;w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();return q.capture();
  },{clip,phase});
  assert.equal(frame.glError,0);assert.deepEqual(frame.errors,[]);const file=`secondary-${clip}-${phase}.jpg`;await sharp(Buffer.from(frame.png,'base64')).jpeg({quality:95}).toFile(`${out}/${file}`);delete frame.png;records.push({...frame,file,phase});
 }
 const profile=await page.evaluate(async()=>{
  const q=beastQA,w=q.world;q.state.time=150;await q.setView('front',5.5,1.7);q.pose('Walking',.2);const [x,y,z]=q.capture().position,angle=q.animal.heading+Math.PI/2+.3;
  w.controls.target.set(x,y+2.2,z);w.camera.position.set(x+Math.sin(angle)*4.5,y+2.5,z+Math.cos(angle)*4.5);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();return q.capture();
 });
 assert.equal(profile.glError,0);assert.deepEqual(profile.errors,[]);await sharp(Buffer.from(profile.png,'base64')).jpeg({quality:95}).toFile(`${out}/head-profile.jpg`);delete profile.png;await writeFile(`${out}/head-profile.json`,JSON.stringify(profile,null,2)+'\n');
 assert.deepEqual(errors,[]);await writeFile(`${out}/secondary-captures.json`,JSON.stringify({scope:'Native production WorldScene/controller, rear detail views of baked rear garment in all six clips.',records},null,2)+'\n');
}finally{await browser.close()}

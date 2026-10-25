import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const {chromium}=createRequire(import.meta.url)('playwright'),base=process.env.WG_QA_URL??'http://127.0.0.1:5194',out='docs/qa/lion-replacement';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],records=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/tests/browser/beast-replacement.html?species=lion&biome=sabana`,{waitUntil:'commit'});await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});assert(await page.evaluate(()=>beastQA.ready));
 for(const clip of ['Walking','Running','Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2'])for(const phase of [.2,.5,.8]){
  const frame=await page.evaluate(async({clip,phase})=>{
   const q=beastQA,w=q.world;q.state.time=150;await q.setView('back',3.4,1);q.pose(clip,phase);
   const [x,y,z]=q.capture().position;w.controls.target.set(x,y+.70,z);w.camera.position.y=y+1.0;w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();return q.capture();
  },{clip,phase});
  assert.equal(frame.glError,0);assert.deepEqual(frame.errors,[]);const file=`secondary-${clip}-${phase}.jpg`;await sharp(Buffer.from(frame.png,'base64')).jpeg({quality:95}).toFile(`${out}/${file}`);delete frame.png;records.push({...frame,file,phase});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/secondary-captures.json`,JSON.stringify({scope:'Native production WorldScene/controller, rear detail views of baked cloth and tail in all six clips.',records},null,2)+'\n');
}finally{await browser.close()}

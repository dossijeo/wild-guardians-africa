import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const {chromium}=createRequire(import.meta.url)('playwright'),species=process.argv[2]??'buffalo';
const out=`docs/qa/${species}-replacement`,base=process.env.WG_QA_URL??'http://127.0.0.1:5194';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],records=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/tests/browser/beast-replacement.html?species=${species}&biome=sabana`,{waitUntil:'commit'});
 await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});assert(await page.evaluate(()=>beastQA.ready));
 for(const side of ['left','right'])for(const phase of [.2,.7]){
  const frame=await page.evaluate(async({side,phase})=>{
   const q=beastQA,w=q.world;q.state.time=150;await q.setView();q.pose('Walking',phase);
   const [x,y,z]=q.capture().position,angle=q.animal.heading+(side==='left'?Math.PI/2:-Math.PI/2);
   w.controls.target.set(x,y+.32,z);w.camera.position.set(x+Math.sin(angle)*2.4,y+.55,z+Math.cos(angle)*2.4);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();
   w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();return q.capture();
  },{side,phase});
  assert.equal(frame.glError,0);assert.deepEqual(frame.errors,[]);const file=`feet-${side}-${phase}.jpg`;
  await sharp(Buffer.from(frame.png,'base64')).jpeg({quality:95}).toFile(`${out}/${file}`);delete frame.png;records.push({...frame,file,side,phase});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/feet-captures.json`,JSON.stringify({scope:'Native production WorldScene/controller, Walking in Sabana, close side views of feet; original drawing buffer, no image manipulation.',records},null,2)+'\n');
}finally{await browser.close()}

import fs from 'node:fs';import {createRequire} from 'node:module';
import {approvedVisualSearch} from '../../src/rendering/approved-visual-profile.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const cases=(process.env.BENCH_CASES??'1,6,11,16,21').split(',').map(Number);
const biomes=['sabana','gran-rio','manglares','volcanes','gran-canon'];
const mode=process.env.BENCH_MODE??'selection';
const out=process.env.BENCH_OUT??'docs/lighting/tree-near-retexture/performance';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const sceneCase of cases){
  const biome=biomes[Math.floor((sceneCase-1)/5)],page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>{errors.push(e.stack??String(e));console.log('ERROR',e.stack??String(e));});
  page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text());});
  const search=approvedVisualSearch(biome,`case=${sceneCase}&q=media&visualLabReference=1`);
  await page.goto(`http://127.0.0.1:5175/tests/browser/african-toon.html?${search}`,{waitUntil:'domcontentloaded',timeout:60000});
  console.log(biome,'loading');
  try{await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:300000});}
  catch(error){fs.writeFileSync(`${out}/${biome}-failure.json`,JSON.stringify({errors,status:await page.locator('#status').textContent(),error:String(error)},null,2));throw error;}
  await page.addStyleTag({content:'body{margin:0}body>header,body>details,body>aside{display:none!important}canvas#world{position:fixed;inset:0;width:100vw;height:100vh}'});
  const records=[];
  for(const view of ['overview','near']){
   if(view==='near')await page.evaluate(async()=>{
    const w=window.qaVisualReference.world,eye=w.camera.position;
    const candidates=[...w.chunks.values()].flatMap(g=>(g.userData.lodBatches??[]).filter(b=>b.slot===0&&b.prototype.nearTextureDistance).flatMap(b=>b.instances.map(p=>({p,b,d:Math.hypot(p.x-eye.x,p.z-eye.z)})))).sort((a,b)=>a.d-b.d);
    if(!candidates.length)throw Error('No near tree fixture');
    const {p,b}=candidates[0],y=p.y+b.prototype.centerY*p.sy;
    w.setCameraExclusion(false);w.controls.target.set(p.x,y,p.z);w.camera.position.set(p.x+10,y+4,p.z+10);
    w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
    w.syncChunks();await w.whenChunksReady();await w.horizon?.whenReady();w.render(0);
   });
   for(const [lot,enabled]of [false,true,true,false].entries()){
    await page.evaluate(({enabled,mode})=>{
     const w=window.qaVisualReference.world;
     if(mode==='maps')for(const levels of w.prototypes){if(!levels[0].userData.nearTextureDistance)continue;const m=levels[0].material;
      m.userData.reviewMaps??={map:m.map,roughnessMap:m.roughnessMap,metalnessMap:m.metalnessMap};
      for(const name of Object.keys(m.userData.reviewMaps))m[name]=enabled?m.userData.reviewMaps[name]:levels[1].material[name];m.needsUpdate=true;
     }
     for(const g of w.chunks.values())for(const b of g.userData.lodBatches??[]){
      if(b.levels[0].userData.nearTextureDistance){b.prototype.nearTextureDistance=enabled||mode==='maps'?b.levels[0].userData.nearTextureDistance:-1;b.key=null;}
     }
     document.querySelector('#benchmarkReport').textContent='';
    },{enabled,mode});
    await page.locator('#benchmark').evaluate(b=>b.click());
    await page.waitForFunction(()=>{try{return !!JSON.parse(document.querySelector('#benchmarkReport').textContent).submittedCalls;}catch{return false;}},null,{timeout:300000});
    const report=await page.locator('#benchmarkReport').evaluate(e=>JSON.parse(e.textContent));
    const populations=await page.evaluate(()=>{const w=window.qaVisualReference.world;return {nearInstances:[...w.chunks.values()].flatMap(g=>g.userData.lodBatches??[]).filter(b=>b.levels[0].userData.nearTextureDistance).reduce((sum,b)=>sum+b.meshes[0].count,0),farAttached:!!w.farVegetation};});
    records.push({view,lot,enabled,mode,report,populations});
    fs.writeFileSync(`${out}/${biome}.json`,JSON.stringify({scope:'Static native WorldScene under approved visual profile; ABBA near selection on/off. Both texture sets resident in both modes, so this isolates rendering, not load cost or added texture memory. Simulation frozen; not combat FPS.',sceneCase,biome,records,errors},null,2)+'\n');
    if(report.errors.length||!report.cameraStable||!report.simulationUnchanged||report.device.hiddenDuringRun)throw Error('Invalid benchmark conditions');
    if(lot===1)await page.screenshot({path:`${out}/${biome}-${view}.png`});
    console.log(biome,view,lot,enabled,'CPU',report.cpuSubmissionMs.mean,'GPU',report.gpuElapsedMs?.mean,'near',populations.nearInstances);
   }
  }
  await page.close();
 }
}finally{await browser.close();}

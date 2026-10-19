import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const out='docs/qa/global-visual-lab/six-biome-reference';
const biomes=[['savanna',1],['grand-river',6],['mangrove',11],['volcanoes',16],['canyons',21],['desert',26]].filter(([name])=>!process.env.WG_VISUAL_BIOME||name===process.env.WG_VISUAL_BIOME);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try{
  for(const [biome,sceneCase] of biomes){
    const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(`${origin}/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=0&visualLabReference=1`,{waitUntil:'domcontentloaded'});
    try{await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:120000});}
    catch(error){console.error(biome,await page.locator('#status').textContent(),errors);throw error;}
    await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
    await page.waitForTimeout(400);
    const metadata=await page.evaluate(()=>{
      const {world,state,biome,culture,seed}=window.qaVisualReference;
      return {biome,culture,seed,time:state.time,camera:world.camera.position.toArray(),target:world.controls.target.toArray(),fov:world.camera.fov,quality:world.quality,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,plants:state.plants.length,walls:state.structures.filter(s=>s.kind==='wall').length,centers:state.structures.filter(s=>s.kind==='center').length,terrainChunks:world.chunks.size,visualLabEnabled:world.groundDetails.enabled};
    });
    const file=`${biome}.png`;
    await page.locator('#world').screenshot({path:`${out}/${file}`});
    records.push({...metadata,file,errors});
    await page.close();
    console.log(`${biome}: ${metadata.plants} crops, ${metadata.walls} walls, ${metadata.drawCalls} calls`);
  }
}finally{await browser.close();}
await writeFile(`${out}/manifest.json`,JSON.stringify({origin,renderer:'WorldScene, original game assets and real WebGL pipeline; controlled visual QA fixture with explicit crop/wall entities, not a legal campaign state',viewport:[1280,720],dpr:1,records},null,2)+'\n');

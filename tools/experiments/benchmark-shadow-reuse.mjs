import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const origin=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
  for(const sceneCase of [1,6,11,16,21,26]){
    const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
    await page.goto(`${origin}/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=0&visualLabReference=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:120000});
    const result=await page.evaluate(async()=>{
      const {shadowSnapshot}=await import('/src/rendering/shadow-cache.js');
      const {world,state,biome}=window.qaVisualReference;
      const sample=(values)=>{const sorted=[...values].sort((a,b)=>a-b);return {median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.floor(sorted.length*.95)],mean:values.reduce((a,b)=>a+b,0)/values.length};};
      const snapshots=[];let vectorLength=0;
      for(let i=0;i<60;i++){const before=performance.now();const result=shadowSnapshot(world.renderer,world.sun,world.scene,world.camera);snapshots.push(performance.now()-before);vectorLength=result?.length??0;}
      const run=(mutate)=>{const cache=world.releaseNativeShadow.cache,prior={...cache.stats},times=[];for(let i=0;i<40;i++){mutate(i);const before=performance.now();world.sync(0);world.render(.016);times.push(performance.now()-before);}return {renderCpuMs:sample(times),draws:cache.stats.draws-prior.draws,hits:cache.stats.hits-prior.hits,untracked:cache.stats.untracked-prior.untracked};};
      const staticScene=run(()=>{});
      const movingActor=run(()=>{state.workers[0].x+=.12;});
      const cameraShift=run(i=>{if(i===0){world.controls.target.x+=8;world.camera.position.x+=8;}});
      return {biome,snapshotCpuMs:sample(snapshots),snapshotValues:vectorLength,staticScene,movingActor,cameraShift,shadowMapSize:world.sun.shadow.mapSize.toArray(),actors:state.workers.length+state.raid.animals.length,objects:world.scene.children.length};
    });
    results.push(result);console.log(result.biome,JSON.stringify({snapshot:result.snapshotCpuMs,values:result.snapshotValues,static:result.staticScene,moving:result.movingActor,camera:result.cameraShift}));
    await page.close();
  }
}finally{await browser.close();}
await mkdir('docs/qa/global-visual-lab/shadow-audit',{recursive:true});
await writeFile('docs/qa/global-visual-lab/shadow-audit/reuse.json',JSON.stringify({origin,device:'Chrome headless, WebGL2 hardware-backed when available',cases:results},null,2)+'\n');

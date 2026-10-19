import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';

const origin=process.env.WG_QA_URL??'http://127.0.0.1:5188';
const variants=(process.env.WG_NORMAL_VARIANTS??'0,normal,normal-relief,normal-enhanced').split(',');
const cases=(process.env.WG_NORMAL_CASES??'1,3').split(',').map(Number);
const out='docs/qa/global-visual-lab/village-normal-relief';
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
await mkdir(out,{recursive:true});
try{
  for(const sceneCase of cases)for(const variant of variants){
    const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(`${origin}/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=${variant}&visualLabReference=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:120000});
    for(const camera of ['full','close']){
      if(camera==='close'){
        await page.locator('#villageClose').evaluate(e=>e.click());
        await page.evaluate(()=>{
          const w=window.qaVisualReference.world;
          const mesh=w.objects.get(w.state.villages[0].id).children.find(m=>m.isMesh);
          const center=mesh.geometry.boundingBox.getCenter(mesh.position.clone()).applyMatrix4(mesh.matrixWorld);
          w.controls.target.copy(center);
          w.camera.position.copy(center).add({x:3.3,y:2.6,z:4.1});
          w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
          w.render(.016);
        });
      }
      await page.locator('#qaControls').evaluate(e=>e.open=false);
      for(const phase of ['day','night']){
        if(phase==='night')await page.locator('#night').evaluate(e=>e.click());
        await page.waitForTimeout(250);
        const filename=`case-${String(sceneCase).padStart(2,'0')}-${variant}-${camera}-${phase}.webp`;
        const pixels=await page.locator('canvas#world').screenshot();
        await sharp(pixels).webp({quality:94,effort:5}).toFile(`${out}/${filename}`);
        if(camera==='close'){
          await page.locator('#benchmark').evaluate(e=>e.click());
          await page.waitForFunction(()=>{try{return !!JSON.parse(document.querySelector('#benchmarkReport').textContent).submittedCalls;}catch{return false;}},null,{timeout:120000});
          const report=JSON.parse(await page.locator('#benchmarkReport').textContent());
          records.push({sceneCase,variant,camera,phase,filename,drawCalls:report.submittedCalls.mean,triangles:report.submittedTriangles?.mean,cpuMs:report.cpuSubmissionMs.mean,gpuMs:report.gpuElapsedMs?.mean??null,fps:report.averageObservedFps,errors:[...errors]});
          await page.locator('#benchmarkReport').evaluate(e=>e.textContent='');
        }
      }
      if(camera==='full')await page.locator('#night').evaluate(e=>e.click());
    }
    await page.close();
  }
}finally{await browser.close();}
await writeFile(`${out}/report.json`,JSON.stringify({origin,variants,cases,records},null,2)+'\n');
console.log(records);

import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/workshop-shared';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),records=[];
try{
 for(const variant of ['0','village-shared-art']){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto(`http://127.0.0.1:5189/tests/browser/african-toon.html?case=1&q=media&visualLab=${variant}&visualLabReference=1`);
  await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'));
  await page.locator('#villageClose').evaluate(e=>e.click());await page.waitForFunction(()=>!document.querySelector('#night').disabled);
  for(const view of ['awning','neighbor-close','neighbor-medium']){
   const state=await page.evaluate(view=>{
    const w=window.qaVisualReference.world,g=w.objects.get(w.state.villages[0].id),units=g.children.filter(m=>m.isMesh),m=units[view==='awning'?0:1];
    for(const child of g.children)child.visible=child===m;
    if(view==='awning'){w.controls.target.set(-.883,-.02,-.13).applyMatrix4(m.matrixWorld);w.camera.position.set(-1.15,.20,.15).applyMatrix4(m.matrixWorld);}
    else{const center=m.geometry.boundingBox.getCenter(m.position.clone()).applyMatrix4(m.matrixWorld);w.controls.target.copy(center);w.camera.position.copy(center).add(view==='neighbor-close'?{x:3.5,y:2.5,z:4.5}:{x:9,y:6.5,z:11});}
    w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};w.render(.016);document.querySelector('#qaControls').open=false;
    return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),unit:m.userData.unit?.key};
   },view);
   for(const phase of ['day','night']){
    const time=phase==='day'?150:350;if(await page.evaluate(()=>window.qaVisualReference.world.state.time)!==time)await page.locator('#night').evaluate(e=>e.click());
    await page.waitForFunction(t=>window.qaVisualReference.world.state.time===t&&!document.querySelector('#night').disabled,time);await page.waitForTimeout(500);
    const file=`${variant}-${view}-${phase}.png`;await page.locator('canvas#world').screenshot({path:`${out}/${file}`});records.push({variant,view,phase,file,...state});
   }
  }
  await page.close();
 }
}finally{await browser.close();}
await writeFile(`${out}/detail-captures.json`,JSON.stringify({note:'Isolated units for diagnostic only; no performance claim',records},null,2)+'\n');

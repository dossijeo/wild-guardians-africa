import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out=process.env.WG_ART_OUTPUT??'docs/qa/global-visual-lab/workshop-finish';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),records=[];
try{
 for(const variant of (process.env.WG_ART_VARIANTS??'0,village-art,village-finish').split(',')){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto(`http://127.0.0.1:5189/tests/browser/african-toon.html?case=1&q=media&visualLab=${variant}&visualLabReference=1`);
  await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'));
  await page.locator('#villageClose').evaluate(e=>e.click());await page.waitForFunction(()=>!document.querySelector('#night').disabled);
  for(const view of (process.env.WG_ART_VIEWS??'facade,medium,awning,neighbor-close').split(',')){
   const state=await page.evaluate(view=>{
    const w=window.qaVisualReference.world,g=w.objects.get(w.state.villages[0].id),units=g.children.filter(m=>m.isMesh),m=units[view==='neighbor-close'?1:0];
    for(const child of g.children)child.visible=view==='medium'||child===m;
    if(view==='facade'){w.controls.target.set(-.72,-.025,.01).applyMatrix4(m.matrixWorld);w.camera.position.set(-.57,.15,.36).applyMatrix4(m.matrixWorld);}
    else if(view==='rear'){w.controls.target.set(-.72,-.025,-.26).applyMatrix4(m.matrixWorld);w.camera.position.set(-.57,.15,-.60).applyMatrix4(m.matrixWorld);}
    else if(view==='awning'){w.controls.target.set(-.883,-.02,-.13).applyMatrix4(m.matrixWorld);w.camera.position.set(-1.15,.20,.15).applyMatrix4(m.matrixWorld);}
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
const previous=JSON.parse(await readFile(`${out}/detail-captures.json`,'utf8').catch(()=>'{}')).records??[];
const keys=new Set(records.map(r=>`${r.variant}/${r.view}/${r.phase}`));records.unshift(...previous.filter(r=>!keys.has(`${r.variant}/${r.view}/${r.phase}`)));
await writeFile(`${out}/detail-captures.json`,JSON.stringify({note:'Fixed cameras; medium full scene, other views isolated diagnostic; no performance claim',records},null,2)+'\n');

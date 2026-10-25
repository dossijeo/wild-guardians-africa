import {disableIntegratedWater} from './water-qa-route.mjs';
import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const study=process.env.WG_MATERIAL_STUDY??'water-surface';const out='docs/qa/global-visual-lab/'+study+'/motion';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const sceneCase of (process.env.WG_WATER_CASES??'1,6,11,21').split(',').map(Number))for(const variant of ['base','surface']){
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 if(study.startsWith('water-'))await disableIntegratedWater(page);
 await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=global-lighting&visualLabReference=1`);await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 const camera=await page.evaluate(async()=>{const {focusWater}=await import('/tools/experiments/qa-water-view.js');return focusWater(window.qaVisualReference.world)});
 if(variant==='surface')await page.evaluate(async(study)=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-'+study+'.js');applyMaterialStudy(window.qaVisualReference.world)},study);
 await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
 await page.evaluate(()=>{const w=window.qaVisualReference.world,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(window.qaWaterClock??0)});
 for(const phase of ['day','night'])for(const clock of [0,2]){
  const stats=await page.evaluate(({phase,clock})=>{const {world:w,state}=window.qaVisualReference;state.time=phase==='day'?150:350;const before=JSON.stringify(state);window.qaWaterClock=clock;w.render(.016);return {simulationUnchanged:before===JSON.stringify(state),camera:w.camera.position.toArray(),target:w.controls.target.toArray(),calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles}}, {phase,clock});
  const file=`case-${sceneCase}-${variant}-${phase}-${clock}.png`;await page.locator('#world').screenshot({path:out+'/'+file});records.push({sceneCase,variant,phase,clock,file,setup:camera,...stats,errors:[...errors]});
 }
 await page.close();console.log(sceneCase,variant);
}}finally{await browser.close()}
await writeFile(out+'/captures.json',JSON.stringify({note:'Only shader animation clock is overridden; simulation is unchanged within each phase.',records},null,2)+'\n');

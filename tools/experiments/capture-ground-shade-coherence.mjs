import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/ground-shade-coherence';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
for(const [biome,sceneCase] of [['savanna',1],['grand-river',6],['mangrove',11],['volcano',16],['canyon',21],['desert',26]])for(const variant of ['0','ground-shade-coherence']){
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(`http://127.0.0.1:5189/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=${variant}&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 if(variant==='ground-shade-coherence'){const audit=await page.evaluate(async()=>{const {applyGroundShadeCoherence}=await import('/tools/experiments/qa-ground-shade-coherence.js');return applyGroundShadeCoherence(window.qaVisualReference.world)});await writeFile(`${out}/shade-audit-${biome}.json`,JSON.stringify(audit,null,2)+'\n');}
 await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const initial=await page.evaluate(()=>{const w=window.qaVisualReference.world;return{position:w.camera.position.toArray(),target:w.controls.target.toArray()}});
 for(const view of ['game','low']){
  await page.evaluate(({view,initial})=>{const {world:w,state}=window.qaVisualReference;if(view==='game'){w.camera.position.fromArray(initial.position);w.controls.target.fromArray(initial.target);}else{const px=state.plants.reduce((n,p)=>n+p.x,0)/state.plants.length,pz=state.plants.reduce((n,p)=>n+p.z,0)/state.plants.length,y=w.nav.field.surface(px,pz);w.controls.target.set(px,y+.9,pz);w.camera.position.set(px+5,y+5,pz+22);}w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};w.render(.016);},{view,initial});
  for(const phase of ['day','night']){
   const time=phase==='day'?150:350;if(await page.evaluate(()=>window.qaVisualReference.state.time)!==time)await page.locator('#night').evaluate(e=>e.click());await page.waitForFunction(t=>window.qaVisualReference.state.time===t&&!document.querySelector('#night').disabled,time);await page.waitForTimeout(400);
   const info=await page.evaluate(()=>{const {world:w,state}=window.qaVisualReference;const d=w.groundDetails;return{camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:state.time,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries,tufts:d.count,instanceBytes:d.mesh?.instanceMatrix.array.byteLength??0,geometryBytes:d.geometry?Object.values(d.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(d.geometry.index?.array.byteLength??0):0,positions:d.count?[...d.chunks.values()].flat().map(p=>[p.x,p.z]):[]}});
   const file=`${biome}-${variant}-${view}-${phase}.png`;await page.locator('#world').screenshot({path:`${out}/${file}`});records.push({biome,variant,view,phase,file,errors:[...errors],...info});
  }
 }
 await page.close();console.log(biome,variant);
}
}finally{await browser.close();}
await writeFile(`${out}/captures.json`,JSON.stringify({note:'Real WorldScene fixture; no CPU/GPU benchmark',records},null,2)+'\n');

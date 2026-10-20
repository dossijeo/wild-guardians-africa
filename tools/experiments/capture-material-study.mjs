import {disableIntegratedRoughness} from './roughness-qa-route.mjs';
import {disableIntegratedWater} from './water-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const study=process.env.WG_MATERIAL_STUDY??'canyon-bedding';const out='docs/qa/global-visual-lab/'+study;await mkdir(out,{recursive:true});const records=process.env.WG_STUDY_APPEND==='1'?JSON.parse(await readFile(out+'/captures.json')).records:[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
for(const [biome,sceneCase] of (['water-surface','water-surface-lean','water-surface-map','ground-frequency','ground-normal-balance','ground-normal-rich','ground-roughness'].includes(study)?[['savanna',1],['grand-river',6],['mangrove',11],['volcano',16],['canyon',21],['desert',26]]:['water-ripples','water-reflections'].includes(study)?[['savanna',1],['grand-river',6]]:['grass-islands','kenney-grass','grass-fine','grass-fine-lite','grass-diffuse','grass-lod'].includes(study)?[['savanna',1]]:study==='volcanic-charcoal'?[['volcano',16]]:[['canyon',21]]).filter(([,c])=>!process.env.WG_STUDY_CASES||process.env.WG_STUDY_CASES.split(',').map(Number).includes(c)))for(const variant of [process.env.WG_STUDY_BASELINE??'global-lighting',study]){
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 if(study==='volcanic-charcoal')await page.route('**/src/rendering/african-toon.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('shader.fragmentShader=patchVolcanicCharcoal(shader.fragmentShader);','/* QA baseline before charcoal integration */')});});
 if(study==='ground-roughness')await disableIntegratedRoughness(page);
 if(study.startsWith('water-'))await disableIntegratedWater(page);
 await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=global-lighting&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 if(variant!=='global-lighting'){const audit=await page.evaluate(async(study)=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-'+study+'.js');return applyMaterialStudy(window.qaVisualReference.world)},variant);await writeFile(out+'/audit-'+biome+(variant===study?'':'-'+variant)+'.json',JSON.stringify(audit,null,2)+'\n');}
 await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});

 const initial=await page.evaluate(()=>{const w=window.qaVisualReference.world;return{position:w.camera.position.toArray(),target:w.controls.target.toArray()}});
 for(const view of (['ground-roughness','canyon-sky','canyon-normal-smooth','canyon-rock-texture','canyon-rock-normal','canyon-stratified','canyon-dominant','canyon-color-only','canyon-soft-bands'].includes(study)?['game','low','side']:['game','low'])){
  await page.evaluate(({view,initial})=>{const {world:w,state}=window.qaVisualReference;if(view==='game'){w.camera.position.fromArray(initial.position);w.controls.target.fromArray(initial.target);}else{const px=state.plants.reduce((n,p)=>n+p.x,0)/state.plants.length,pz=state.plants.reduce((n,p)=>n+p.z,0)/state.plants.length,y=w.nav.field.surface(px,pz);w.controls.target.set(px,y+.9,pz);w.camera.position.set(px+5,y+5,pz+22);if(view==='side')w.camera.position.set(px+22,y+10,pz);}w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};w.render(.016);},{view,initial});
  for(const phase of ['day','night']){
   const time=phase==='day'?150:350;if(await page.evaluate(()=>window.qaVisualReference.state.time)!==time)await page.locator('#night').evaluate(e=>e.click());await page.waitForFunction(t=>window.qaVisualReference.state.time===t&&!document.querySelector('#night').disabled,time);await page.waitForTimeout(400);
   if(['canyon-dominant','canyon-color-only','canyon-soft-bands'].includes(study))await page.evaluate(async()=>{const w=window.qaVisualReference.world;await w.whenChunksReady();w.render(.016);});
   const info=await page.evaluate(()=>{const {world:w,state}=window.qaVisualReference;const d=w.groundDetails;return{cliffBinding:w.qaCliffBinding?.()??null,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:state.time,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries,tufts:d.count,lodCounts:d.farMesh?{near:d.mesh.count,far:d.farMesh.count}:null,instanceBytes:d.mesh?.instanceMatrix.array.byteLength??0,geometryBytes:d.geometry?Object.values(d.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(d.geometry.index?.array.byteLength??0):0,positions:d.count?[...d.chunks.values()].flat().map(p=>[p.x,p.z]):[]}});
   const file=`${biome}-${variant}-${view}-${phase}.png`;await page.locator('#world').screenshot({path:`${out}/${file}`});records.push({biome,variant,view,phase,file,errors:[...errors],...info});
  }
 }
 await page.close();console.log(biome,variant);
}
}finally{await browser.close();}
await writeFile(`${out}/captures.json`,JSON.stringify({note:'Real WorldScene fixture; no CPU/GPU benchmark',records},null,2)+'\n');

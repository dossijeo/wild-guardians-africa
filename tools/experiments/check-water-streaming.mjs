import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/water-integrated/streaming';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:5190/tests/browser/african-toon.html?case=6&q=media&visualLab=global-lighting&visualLabReference=1');await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 await page.evaluate(async()=>{const w=window.qaVisualReference.world;const {focusWater}=await import('/tools/experiments/qa-water-view.js');await focusWater(w);const u=w.fluidMaterial.userData.globalWaterSlope;if(!u)throw Error('Missing integrated water');window.qaSlopeTexture=u.value;window.qaSlopeDisposals=0;u.value.addEventListener('dispose',()=>window.qaSlopeDisposals++);});
 await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
 for(const phase of ['day','night'])for(const rebase of [false,true]){
  const info=await page.evaluate(({phase,rebase})=>{const w=window.qaVisualReference.world;w.state.time=phase==='day'?150:350;w.renderOrigin.x=rebase?Math.round((w.controls.target.x+48)/48)*48:0;w.renderOrigin.z=rebase?Math.round((w.controls.target.z+48)/48)*48:0;w.renderOrigin.revision++;w.releaseNativeShadow.cache.invalidate();w.render(.016);return{camera:w.camera.position.toArray(),target:w.controls.target.toArray(),origin:[w.renderOrigin.x,w.renderOrigin.z],clock:w.fluidMaterial.userData.paintUniforms.uTime.value,time:w.state.time}}, {phase,rebase});
  const file=`${phase}-${rebase?'rebased':'base'}.png`;await page.locator('#world').screenshot({path:out+'/'+file});records.push({phase,rebase,file,...info});
 }
 const stream=await page.evaluate(async()=>{const w=window.qaVisualReference.world;const {focusWater}=await import('/tools/experiments/qa-water-view.js');const result=[];
  for(const dz of [0,96,-96]){w.controls.target.z+=dz;await focusWater(w);const mats=[...w.materialRegistry.waters.keys()].filter(m=>m.userData.paintUniforms.uSurfaceLava.value<.5);result.push({shift:dz,chunks:w.chunks.size,materials:mats.length,unbound:mats.filter(m=>!m.userData.globalWaterSlope).length,sameTexture:mats.every(m=>m.userData.globalWaterSlope?.value===window.qaSlopeTexture),textures:w.renderer.info.memory.textures})}
  w.dispose();return {steps:result,textureDisposals:window.qaSlopeDisposals};});
 await writeFile(out+'/report.json',JSON.stringify({records,stream,errors},null,2)+'\n');console.log(JSON.stringify({stream,errors}));
}finally{await browser.close()}

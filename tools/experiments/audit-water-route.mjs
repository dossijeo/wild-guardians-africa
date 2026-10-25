import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/water-route-audit';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5190/tests/browser/african-toon.html?case=1&q=media&visualLab=global-lighting&visualLabReference=1');
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
 const audit=await page.evaluate(()=>{const w=window.qaVisualReference.world;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};const meshes=[];w.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.paintUniforms)meshes.push({name:o.name,kind:o.userData.nativeFluid,slot:o.userData.nativePropSlot,visible:o.visible,count:o.count,vertices:o.geometry.attributes.position.count,clip:o.material.userData.paintUniforms.uFluidClip.value,bounds:o.material.userData.paintUniforms.uFluidBounds.value.toArray()})});return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,meshes}});
 await page.locator('#world').screenshot({path:out+'/base.png'});
 await page.evaluate(()=>{window.qaVisualReference.world.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.paintUniforms)o.visible=false})});await page.evaluate(()=>window.qaVisualReference.world.render(.016));await page.waitForTimeout(250);await page.locator('#world').screenshot({path:out+'/hidden-fluid.png'});
 await page.evaluate(()=>{const mats=new Set();window.qaVisualReference.world.scene.traverse(o=>{if(o.isMesh&&o.material?.userData?.paintUniforms){o.visible=true;mats.add(o.material)}});for(const m of mats){const original=m.onBeforeCompile;m.onBeforeCompile=(s,r)=>{original(s,r);s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=vec3(1.,0.,1.);\n#include <opaque_fragment>')};m.customProgramCacheKey=()=> 'qa-fluid-magenta';m.needsUpdate=true}});await page.evaluate(()=>window.qaVisualReference.world.render(.016));await page.waitForTimeout(500);await page.locator('#world').screenshot({path:out+'/diagnostic-fluid.png'});
 await writeFile(out+'/audit.json',JSON.stringify({...audit,errors},null,2)+'\n');console.log(JSON.stringify({meshes:audit.meshes.length,errors}));
}finally{await browser.close()}

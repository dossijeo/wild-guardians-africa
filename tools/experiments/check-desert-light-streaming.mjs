import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/desert-light-integrated';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text())});
 await page.goto('http://127.0.0.1:5190/tests/browser/african-toon.html?case=26&q=media&visualLab=global-lighting&visualLabReference=1');
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 '),null,{timeout:120000});
 const steps=[];
 for(const dz of [0,288,-288]){
  const info=await page.evaluate(async dz=>{
   const THREE=await import('/node_modules/three/build/three.module.js');const {world:w}=window.qaVisualReference;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};
   w.controls.target.z+=dz;w.camera.position.z+=dz;w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(.016);
   const resident=w.terrainMeshes.map(m=>m.material),horizon=(w.horizon?.group?.children??[]).filter(m=>m.userData.nativeHorizon==='terrain').map(m=>m.material);
   const audit=materials=>({count:materials.length,patched:materials.filter(m=>{const lib=m.isMeshBasicMaterial?THREE.ShaderLib.basic:THREE.ShaderLib.standard;const shader={...lib,uniforms:THREE.UniformsUtils.clone(lib.uniforms)};m.onBeforeCompile(shader,w.renderer);return shader.fragmentShader.includes('smoothstep(.13,.37,x)')}).length,biomes:[...new Set(materials.map(m=>m.userData.groundBiome))]});
   const gl=w.renderer.getContext(),compiled=w.renderer.info.programs.filter(p=>gl.getShaderSource(p.fragmentShader)?.includes('smoothstep(.13,.37,x)')).length;
   return {dz,camera:w.camera.position.toArray(),chunks:[...w.chunks.keys()],resident:audit(resident),horizon:audit(horizon),compiled};
  },dz);
  if(!info.compiled||!info.resident.count||info.resident.patched!==info.resident.count||!info.horizon.count||info.horizon.patched!==info.horizon.count)throw Error('Unpatched desert terrain after streaming: '+JSON.stringify(info));
  steps.push(info);
 }
 if(JSON.stringify(steps[0].chunks)===JSON.stringify(steps[1].chunks))throw Error('Streaming did not change chunks');
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(`${out}/streaming.json`,JSON.stringify({steps,errors},null,2)+'\n');console.log(JSON.stringify({steps:steps.map(s=>({dz:s.dz,resident:s.resident,horizon:s.horizon,compiled:s.compiled})),errors}));
}finally{await browser.close()}

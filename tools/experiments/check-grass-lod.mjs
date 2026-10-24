import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const root='docs/qa/global-visual-lab/grass-lod';const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5190/tests/browser/african-toon.html?case=1&q=media&visualLab=global-lighting&visualLabReference=1');
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 '),null,{timeout:120000});
 await page.evaluate(async()=>{await (await import('/tools/experiments/qa-grass-lod.js')).applyMaterialStudy(window.qaVisualReference.world)});
 await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
 const results=[];
 for(const distance of [21.8,22.2,21.8]){
  const result=await page.evaluate(distance=>{
   const {world:w,state}=window.qaVisualReference,d=w.groundDetails;
   window.qaGrassFocus??=[...d.chunks.values()].flat().sort((a,b)=>(a.x-w.controls.target.x)**2+(a.z-w.controls.target.z)**2-((b.x-w.controls.target.x)**2+(b.z-w.controls.target.z)**2))[0];
   const p=window.qaGrassFocus;w.controls.target.set(p.x,p.y+.2,p.z);w.camera.position.set(p.x+Math.sqrt(distance*distance-100),p.y+10,p.z);
   w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};w.render(.016);
   const keys=[];for(const mesh of [d.mesh,d.farMesh])for(let i=0;i<mesh.count;i++)keys.push(Array.from(mesh.instanceMatrix.array.slice(i*16+12,i*16+15)).join(','));
   return {distance,near:d.mesh.count,far:d.farMesh.count,total:d.count,unique:new Set(keys).size,time:state.time,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles};
  },distance);
  if(result.total>128||result.unique!==result.total||result.near+result.far!==result.total)throw Error('LOD population invariant failed');
  const file='transition-side-'+results.length+'.png';await page.locator('#world').screenshot({path:root+'/'+file});results.push({...result,file});
 }
 await writeFile(root+'/transition-side.json',JSON.stringify({errors,results,note:'QA camera moves across 22 m boundary and returns; static day only, no streaming or simulation updates.'},null,2)+'\n');
 console.log(JSON.stringify(results));
}finally{await browser.close()}

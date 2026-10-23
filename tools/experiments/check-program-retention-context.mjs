import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/program-retention-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><canvas id="test"></canvas>'}));
 await page.goto('http://127.0.0.1:5299/program-retention-qa');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),{retainWarmedPrograms}=await import('/src/rendering/retain-warmed-programs.js');
  const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas}),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.z=3;
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial({color:0x55aa33});scene.add(new THREE.Mesh(geometry,material));renderer.setSize(64,64);renderer.render(scene,camera);
  const lease=retainWarmedPrograms(renderer),oldPrograms=renderer.info.programs;
  const event=name=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(name+' timeout')),10000);canvas.addEventListener(name,()=>{clearTimeout(timer);resolve();},{once:true});});
  const lost=event('webglcontextlost');renderer.forceContextLoss();await lost;
  await new Promise(r=>setTimeout(r,100));const restored=event('webglcontextrestored');renderer.forceContextRestore();await restored;
  if(renderer.info.programs===oldPrograms)throw Error('Context programs not replaced');
  lease.dispose();if(lease.stats.abandoned!==lease.stats.retained||lease.stats.destroyed)throw Error('Stale program deleted');
  renderer.render(scene,camera);const gl=renderer.getContext();if(gl.getError()!==gl.NO_ERROR)throw Error('GL error after recovery');
  const fresh=retainWarmedPrograms(renderer);fresh.dispose();
  const report={revision:THREE.REVISION,old:lease.stats,fresh:fresh.stats,restoredPrograms:renderer.info.programs.length};
  geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();return report;
 });
 if(errors.length)throw Error(JSON.stringify(errors));await writeFile('docs/qa/wild-engine-pthreads/program-retain-context.json',JSON.stringify({scope:'Real Chrome WebGL context restoration on a small scene; not full-game context acceptance',result,errors},null,2)+'\n');console.log(result);
}finally{await browser.close();}

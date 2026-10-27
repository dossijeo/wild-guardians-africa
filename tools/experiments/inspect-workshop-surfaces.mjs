import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const variant=process.env.WG_ART_VARIANT??'village-art';
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(`http://127.0.0.1:5189/tests/browser/african-toon.html?case=1&q=media&visualLab=${variant}&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
 await page.locator('#villageClose').evaluate(e=>e.click());
 await page.waitForFunction(()=>!document.querySelector('#night').disabled);
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const w=window.qaVisualReference.world,m=w.objects.get(w.state.villages[0].id).children.find(m=>m.isMesh);
  const center=m.geometry.boundingBox.getCenter(m.position.clone()).applyMatrix4(m.matrixWorld);
  w.controls.target.copy(center);w.camera.position.copy(center).add({x:9,y:6.5,z:11});w.updateCamera=()=>{w.camera.lookAt(center);w.camera.updateMatrixWorld();};w.render(.016);
  const ray=new THREE.Raycaster(),points=[];
  for(const [label,x,y]of [['door-top',566,408],['door-middle',570,450],['door-bottom',577,491],['beam',575,410],['left-post',536,465],['right-post',608,500],['stone-side',738,489],['stone-side-low',716,533],['front-sun',618,523],['trim',635,418]]){
   ray.setFromCamera({x:x/640-1,y:1-y/360},w.camera);const h=ray.intersectObject(m)[0];
   if(h)points.push({label,screen:[x,y],local:m.worldToLocal(h.point).toArray(),normal:h.face.normal.toArray(),face:h.faceIndex});
  }
  return points;
 });
 console.log(JSON.stringify(result,null,2));
 await writeFile('docs/qa/global-visual-lab/workshop-art/surface-probes.json',JSON.stringify(result,null,2)+'\n');
 await page.evaluate(()=>{
  const w=window.qaVisualReference.world,m=w.objects.get(w.state.villages[0].id).children.find(m=>m.isMesh);
  // Diagnostic isolates the actual target; an adjacent original unit otherwise
  // occludes it and can be mistaken for the edited workshop.
  for(const child of w.objects.get(w.state.villages[0].id).children)if(child!==m)child.visible=false;
  const target=m.position.clone().set(-.72,-.025,.01).applyMatrix4(m.matrixWorld);
  w.controls.target.copy(target);w.camera.position.set(-.57,.15,.36).applyMatrix4(m.matrixWorld);
  w.updateCamera=()=>{w.camera.lookAt(target);w.camera.updateMatrixWorld();};w.render(.016);
  document.querySelector('#qaControls').open=false;
 });
 await page.waitForTimeout(500);
 await page.locator('canvas#world').screenshot({path:`docs/qa/global-visual-lab/workshop-art/${variant}-facade-day.png`});
 const facade=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),w=window.qaVisualReference.world,m=w.objects.get(w.state.villages[0].id).children.find(m=>m.isMesh),ray=new THREE.Raycaster(),result=[];
  for(const [x,y]of [[800,400],[780,350],[790,460],[780,420],[510,555],[680,647],[580,650],[810,662]]){ray.setFromCamera({x:x/640-1,y:1-y/360},w.camera);const h=ray.intersectObject(m)[0];if(h)result.push({screen:[x,y],face:h.faceIndex,point:m.worldToLocal(h.point).toArray(),normal:h.face.normal.toArray()});}return result;
 });
 await writeFile('docs/qa/global-visual-lab/workshop-art/facade-probes.json',JSON.stringify(facade,null,2)+'\n');
 console.log('Facade',JSON.stringify(facade));
 await page.locator('#night').evaluate(e=>e.click());
 await page.waitForFunction(()=>!document.querySelector('#night').disabled&&window.qaVisualReference.world.state.time===350);
 await page.waitForTimeout(500);
 await page.locator('canvas#world').screenshot({path:`docs/qa/global-visual-lab/workshop-art/${variant}-facade-night.png`});
}finally{await browser.close();}

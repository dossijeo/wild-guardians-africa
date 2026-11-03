import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const duration=Number(process.env.TREE_FADE_DURATION??1);if(!Number.isFinite(duration)||duration<=0||duration>1)throw Error('Invalid TREE_FADE_DURATION');
const out=duration===1?'docs/guardian/gpu-animation/buffalo-tree-camera-transition':`docs/guardian/gpu-animation/buffalo-tree-camera-transition-${duration}`;
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&treeReview&recoveryDay&productionFarWarm&wildEngineThreads=0',{waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>{try{return window.treeReview&&JSON.parse(document.querySelector('#status').textContent).combatPhysics}catch{return false;}},null,{timeout:180000});
 await page.evaluate(()=>window.treeReview.setManual(true));await page.locator('#stress').evaluate(e=>e.click());
 const result=await page.evaluate(async duration=>{
  const r=window.treeReview,w=r.world,T=await import('/node_modules/three/build/three.module.js');if(r.authority!=='spatial-wasm'||!r.state.mangroveNetwork)throw Error('Native island mangroves required');r.setManual(true);
  for(let i=0;i<600;i++){w.render(0);if(r.state.raid?.animals.some(a=>a.species==='buffalo'&&w.mixers.get(a.id)?.expression?.bindings.length))break;await new Promise(requestAnimationFrame);}
  const actor=r.state.raid?.animals.find(a=>a.species==='buffalo'&&w.mixers.get(a.id)?.expression?.bindings.length);if(!actor)throw Error('Buffalo missing');
  for(const a of w.farVegetation.adapters)a.layer.transitions.duration=duration;
  const y=w.nav.field.surface(actor.x,actor.z);w.setCameraExclusion(false);w.controls.target.set(actor.x,y+1.2,actor.z);w.camera.position.set(actor.x+5,y+6,actor.z+8);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};w.updateCamera();
  const frustum=new T.Frustum(),sphere=new T.Sphere(),stages=[];
  for(let frame=0;frame<=120;frame++){
   if(frame){await new Promise(requestAnimationFrame);w.render(0,1/30);}else w.render(0,0);
   if(![0,1,2,5,15,30,60,120].includes(frame))continue;
   frustum.setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(w.camera.projectionMatrix,w.camera.matrixWorldInverse));const trees=[];
   for(const a of w.farVegetation?.adapters??[]){const l=a.layer,c=l.current;if(!c)continue;for(const tree of c.trees){const distance=Math.hypot(tree.x-w.camera.position.x,tree.z-w.camera.position.z);if(distance>90)continue;const h=l.metadata.impostorHeight*(tree.sy??tree.scale??1),width=l.metadata.impostorWidth*Math.max(tree.sx??tree.scale??1,tree.sz??tree.scale??1);sphere.center.set(tree.x,tree.y+h*.5,tree.z);sphere.radius=Math.hypot(width,h)*.5;if(!frustum.intersectsSphere(sphere))continue;const st=c.prototype.treeState(tree.id),d=a.readinessDiagnosis(tree.id);trees.push({id:tree.id,slot:l.options.slot,distance,ready:st?.ready??null,coverage:d.coverage,prepared:d.prepared,standbyAvailable:d.standbyAvailable});}}
   stages.push({frame,trees,pending:w.farVegetation.adapters.map(a=>a.preparationStatus()),png:w.renderer.domElement.toDataURL('image/png')});
  }
  const gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {authority:r.authority,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),duration,camera:w.camera.position.toArray(),stages,errors:r.errors,scope:'QA camera teleports to buffalo in native island mangroves. First frame uses dt=0; subsequent frames advance visual time by 1/30s. Sphere test conservatively includes partially visible trees; readiness is not a pixel-visibility or performance measurement.'};
 },duration);
 if(errors.length||result.errors.length)throw Error(JSON.stringify({errors,scene:result.errors}));await mkdir(out,{recursive:true});for(const s of result.stages){await writeFile(`${out}/frame-${s.frame}.png`,Buffer.from(s.png.split(',')[1],'base64'));delete s.png;}await writeFile(`${out}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.stages.map(s=>({frame:s.frame,trees:s.trees.length,unready:s.trees.filter(t=>t.ready<.999).length,pending:s.pending}))));
}finally{await browser.close();}

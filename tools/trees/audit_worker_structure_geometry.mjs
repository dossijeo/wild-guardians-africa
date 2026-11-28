import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=manglares&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
 const report=await page.evaluate(async()=>{
  const r=window.treeReview;r.setManual(true);r.world.render(0);
  const [{Box3},{centerCulture},{captureStructureTemplate,createWorkerStructureObjects}]=await Promise.all([import('/node_modules/three/build/three.module.js'),import('/src/world/centers.js'),import('/src/simulation/worker-structure-geometry.js')]);
  const center=r.state.structures.find(s=>s.kind==='center'&&s.status==='intact'),root=r.world.objects.get(center?.id);if(!root)throw Error('No native center in scene');
  const template=captureStructureTemplate(root),culture=centerCulture(center,r.state),originalYaw=center.yaw,angles=[0,.37,Math.PI/2,Math.PI,Math.PI*1.7];let maxError=0;
  try{for(const yaw of angles){const worker=createWorkerStructureObjects(r.state,r.nav,{[culture]:structuredClone(template)});try{center.yaw=yaw;root.rotation.y=yaw;root.updateMatrixWorld(true);worker.sync(center);const expected=new Box3().setFromObject(root),actual=new Box3().setFromObject(worker.objects.get(center.id));for(const side of ['min','max'])for(const axis of ['x','y','z'])maxError=Math.max(maxError,Math.abs(expected[side][axis]-actual[side][axis]));}finally{worker.dispose();}}if(maxError>1e-8)throw Error('Scene bounds differ: '+maxError);
   return {biome:r.state.biome,culture,parts:template.parts.length,angles:angles.length,maxError,scope:'One existing intact NativeBuilding in the island-mangrove QA scene, including child geometry. Compares bounds after changing yaw; no physics, damage transitions, other cultures or production integration.'};
  }finally{center.yaw=originalYaw;root.rotation.y=originalYaw??0;}
 });
 if(errors.length)throw Error(errors.join('\n'));await writeFile('docs/guardian/gpu-animation/worker-structure-geometry.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}

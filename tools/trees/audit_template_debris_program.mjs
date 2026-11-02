import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const biome=process.env.REVIEW_BIOME??'manglares',page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome=${encodeURIComponent(biome)}&culture=mapungubwe&lightingReview&productionFarWarm&treeReview&recoveryDay&wildEngineThreads=0`);
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
 const report=await page.evaluate(async({keepMaterial})=>{
  const r=window.treeReview;r.setManual(true);const w=r.world,renderer=w.renderer,entity=r.state.structures.find(s=>s.kind==='center'),actual=[...w.destructionPass.buildings].find(b=>b.entityId===entity?.id);
  if(!actual)throw Error('Missing real center');
  const {NativeBuilding}=await import('/src/rendering/buildings.js'),{prepareDebrisProgram}=await import('/src/rendering/debris-gpu-preload.js'),{retainWarmedPrograms}=await import('/src/rendering/retain-warmed-programs.js');
  const counts=()=>({buildings:w.destructionPass.buildings.size,opening:w.destructionPass.scene.children.length,smoke:w.destructionPass.smokeScene.children.length,programs:renderer.info.programs.length});
  const before=counts(),existingProgram=renderer.properties.get(actual.effects.debris.material).currentProgram??null,started=performance.now();
  let temp,lease,prototypeProgram,heldMaterial;const times={},memoryBefore=renderer.info.memory.geometries;
  try{
   let t=performance.now();temp=new NativeBuilding(actual.template,{...entity,id:'qa-temporary-primer'},w.destructionPass,r.state.elapsed);times.construct=performance.now()-t;
   t=performance.now();await prepareDebrisProgram(renderer,w.scene,w.camera,temp.effects.debris,{compile:(scene,camera,target)=>renderer.compileAsync(scene,camera,target)});times.prepare=performance.now()-t;
   prototypeProgram=renderer.properties.get(temp.effects.debris.material).currentProgram;if(!prototypeProgram)throw Error('Primer has no program');
   lease=retainWarmedPrograms(renderer,{limit:1,select:p=>p===prototypeProgram});if(lease.stats.retained!==1)throw Error('Program retention unavailable');
   if(keepMaterial){heldMaterial=temp.effects.debris.material;temp.effects.debris.material=heldMaterial.clone();}
   t=performance.now();temp.dispose();temp=null;times.dispose=performance.now()-t;const afterDispose=counts(),retained=renderer.info.programs.includes(prototypeProgram);
   t=performance.now();await prepareDebrisProgram(renderer,w.scene,w.camera,actual.effects.debris,{compile:(scene,camera,target)=>renderer.compileAsync(scene,camera,target)});times.actualPrepare=performance.now()-t;
   const actualProgram=renderer.properties.get(actual.effects.debris.material).currentProgram;
   return {biome:r.state.biome,network:r.state.mangroveNetwork??false,authority:r.authority,keepMaterial,before,afterDispose,after:counts(),memoryBefore,memoryAfter:renderer.info.memory.geometries,alreadyCompiled:!!existingProgram,sameProgram:prototypeProgram===actualProgram,programKeys:[prototypeProgram.cacheKey,actualProgram.cacheKey],retained,lease:{...lease.stats},times,totalMs:performance.now()-started,sceneErrors:r.errors};
  }finally{temp?.dispose();heldMaterial?.dispose();lease?.dispose();}
 },{keepMaterial:process.env.KEEP_MATERIAL==='1'});
 if(errors.length||report.sceneErrors.length||!report.retained||report.before.buildings!==report.afterDispose.buildings||report.before.opening!==report.afterDispose.opening||report.before.smoke!==report.afterDispose.smoke)throw Error(JSON.stringify({report,errors}));
 report.scope='Isolated existing-center QA scene, synthetic NativeBuilding and program retention only. Does not prove the new-game loading path, visual equivalence, frame-time improvement, or safe production integration.';
 await writeFile(`docs/lighting/tree-near-retexture/performance/${biome}-template-debris-program-${process.env.RUN_SUFFIX??'1'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}

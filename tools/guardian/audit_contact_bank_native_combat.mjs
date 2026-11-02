import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
execFileSync(process.execPath,['tools/guardian/export_contact_banks_qa.mjs'],{stdio:'inherit'});
const banks=JSON.parse(await readFile('.cache/contact-bank-qa/walking.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];let intercepted=0;page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/src/rendering/scene.js*',async route=>{
  const response=await route.fetch(),source=await response.text(),needle='if(!audit?.disabled)supportAnimalOnTerrain(data,this.animalSupportSurface??=(x,z)=>this.nav.actorSurface(x,z));';
  if(!source.includes(needle))throw Error('Support interception point changed');
  intercepted++;await route.fulfill({response,body:source.replace(needle,'if(!audit?.disabled)(globalThis.qaContactCompare??((d,e,s)=>supportAnimalOnTerrain(d,s)))(data,entity,this.animalSupportSurface??=(x,z)=>this.nav.actorSurface(x,z));')});
 });
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?nativeRaid&biome=sabana&lightingReview&treeReview&recoveryDay&productionFarWarm&wildEngineThreads=0');
 await page.waitForFunction(()=>{try{return window.treeReview&&JSON.parse(document.querySelector('#status').textContent).combatPhysics}catch{return false;}},null,{timeout:180000});
 const setup=await page.evaluate(async banks=>{
  const {Vector3}=await import('/node_modules/three/build/three.module.js'),{supportAnimalOnTerrain}=await import('/src/rendering/animal-terrain-support.js');const w=window.treeReview.world,point=new Vector3(),stats={eligible:0,fallback:{},bySpecies:{}};
  window.qaContactAudit=stats;
  window.qaContactCompare=(data,actor,surface)=>{
   const bank=banks[actor.species];let reason=null;
   if(!bank)reason='missing-bank';else if(data.name!=='Walking')reason='other-clip';else if(data.impactApplied)reason='impact';else if(!data.model.parent)reason='missing-parent';
   if(reason){stats.fallback[reason]=(stats.fallback[reason]??0)+1;return supportAnimalOnTerrain(data,surface);}
   const t=(actor.status==='waiting'&&!actor.path?0:(actor.motionPhase??w.state.elapsed))%bank.duration;let lo=0;while(lo+1<bank.times.length&&bank.times[lo+1]<=t)lo++;const hi=Math.min(lo+1,bank.times.length-1),f=hi===lo?0:(t-bank.times[lo])/(bank.times[hi]-bank.times[lo]);data.model.parent.updateWorldMatrix(true,false);let candidate=0;
   for(let i=0;i<bank.contacts;i++){const a=bank.samples[lo][i],b=bank.samples[hi][i];point.set(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f).applyMatrix4(data.model.parent.matrixWorld);candidate=Math.max(candidate,.01+surface(point.x,point.z)-point.y);}
   const original=supportAnimalOnTerrain(data,surface),row=stats.bySpecies[actor.species]??={count:0,maxError:0,sumError:0,errors:[],statuses:{}};row.count++;const error=Math.abs(candidate-original);if(!Number.isFinite(error))throw Error('Non-finite support difference');if(error>row.maxError){row.maxError=error;row.worst={phase:t,original,candidate,status:actor.status,x:actor.x,z:actor.z,heading:actor.heading??null,rootMatrix:data.model.parent.matrixWorld.toArray(),localScale:data.model.scale.toArray(),localQuaternion:data.model.quaternion.toArray()};}row.sumError+=error;row.errors.push(Math.abs(candidate-original));row.statuses[actor.status]=(row.statuses[actor.status]??0)+1;stats.eligible++;return original;
  };
  const gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {authority:window.treeReview.authority,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
 },banks);
 if(setup.authority!=='spatial-wasm'||intercepted!==1)throw Error('Native world or interception unavailable');
 await page.locator('#species').selectOption('lion');await page.locator('#direction').selectOption('side');await page.locator('#benchCollision').evaluate(e=>e.click());
 try{await page.waitForFunction(()=>{try{const r=JSON.parse(document.querySelector('#status').textContent).report;return window.treeReview?.errors?.length||r?.completedSimulation;}catch{return window.treeReview?.errors?.length>0;}},null,{timeout:120000});}catch(error){const details=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,fixtureErrors:window.treeReview?.errors,audit:window.qaContactAudit}));await writeFile('.cache/contact-bank-qa/raid-failure.json',JSON.stringify({failure:String(error),errors,details},null,2));throw error;}
 const result=await page.evaluate(()=>({report:JSON.parse(document.querySelector('#status').textContent).report,audit:window.qaContactAudit,fixtureErrors:window.treeReview.errors}));
 if(errors.length||result.fixtureErrors.length||result.report.errors?.length||result.report.hiddenFrames||result.report.rejectedPhysics||!result.audit.eligible||!result.report.frames)throw Error(JSON.stringify({errors,result}));
 for(const row of Object.values(result.audit.bySpecies)){row.errors.sort((a,b)=>a-b);row.p95=row.errors[Math.floor((row.errors.length-1)*.95)];row.p99=row.errors[Math.floor((row.errors.length-1)*.99)];delete row.errors;}
 const report={scope:'Instrumented native combat cycle with two staged beasts: candidate support is calculated in shadow, then the original support is always applied. Eligibility excludes non-Walking clips and active impact reaction; no candidate is integrated. Candidate and reference both run, so timing and FPS are not performance comparisons. Does not validate other biomes, visual differences, falling/recovery, all pose modifications or future integration.',setup,intercepted,frames:result.report.frames,quality:{hiddenFrames:result.report.hiddenFrames,rejectedPhysics:result.report.rejectedPhysics,reportedErrors:result.report.errors},outcome:result.report.finalActors,audit:result.audit,errors,fixtureErrors:result.fixtureErrors};
 await writeFile(process.env.OUTPUT??'docs/guardian/gpu-animation/contact-bank-native-combat-shadow.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({setup,frames:report.frames,audit:report.audit}));
}finally{await browser.close();}


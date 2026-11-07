// Manual hardware QA. The native savanna snapshot and player Attack are unchanged.
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const timeout=Number(process.env.QA_TIMEOUT_MS??180000),base=process.env.QA_BASE_URL??'http://127.0.0.1:5175',target=process.env.QA_ACTOR_ID??'animal-396',prefix=process.env.QA_OUTPUT??'.cache/historical-rapier',debugPort=process.env.QA_DEBUG_PORT===undefined?null:Number(process.env.QA_DEBUG_PORT);
if(!Number.isSafeInteger(timeout)||timeout<1000||debugPort!==null&&(!Number.isInteger(debugPort)||debugPort<1||debugPort>65535))throw TypeError('Invalid QA timeout or CDP port');
const fixturePath=process.env.QA_FIXTURE??'tests/fixtures/sabana712-d1-native-active-raid.json.gz',started=Date.now(),deadline=started+timeout,report={target,stage:'fixture',started:new Date(started).toISOString(),timeoutMs:timeout,fixture:fixturePath,debugPort,frames:[],errors:[],completed:false};let browser,page,ticker,timer,probePending=false;
const remaining=()=>Math.max(1,deadline-Date.now());
const bounded=(promise,ms,label)=>{let handle;return Promise.race([promise,new Promise((_,reject)=>{handle=setTimeout(()=>reject(Error(label+' timeout')),ms);})]).finally(()=>clearTimeout(handle));};
async function logLatest(){const latest={...(report.latest??{}),at:new Date().toISOString(),stage:report.stage,errors:[...report.errors],elapsedMs:Date.now()-started};console.log('WG_QA_STATUS',JSON.stringify(latest));await writeFile(prefix+'-latest.json',JSON.stringify(latest,null,2));}
async function probe(log=false){
 if(!page)return;while(probePending&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));if(Date.now()>=deadline)return;probePending=true;
 try{
  const value=await bounded(page.evaluate(async id=>{
   const safe=fn=>{try{return fn?.()??null;}catch(error){return {error:String(error?.message??error)};}};
   const game=safe(globalThis.wildGuardiansWorkerQa),client=safe(globalThis.wildGuardiansWebGpuCameraTerrainQa),visibility=safe(globalThis.wildGuardiansVisibilityQa),combat=safe(globalThis.wildGuardiansWorkerCombatQa),alerts=[...document.querySelectorAll('.error-banner,[role="alert"]')].map(node=>node.textContent?.trim()).filter(Boolean);
   let surface=null;if(globalThis.wildGuardiansWebGpuWorldQa)try{surface=await Promise.race([globalThis.wildGuardiansWebGpuWorldQa({auditActorId:id}),new Promise(resolve=>setTimeout(()=>resolve({inspectionTimeout:true}),2000))]);}catch(error){surface={inspectionError:String(error?.message??error)};}
   return {game,client,surface,combatTarget:combat?.animals?.find(actor=>actor.id===id)??null,visibleTarget:visibility?.actors?.find(actor=>actor.id===id)??null,alerts};
  },target),Math.min(4000,remaining()),'Status inspection');
  report.latest={at:new Date().toISOString(),stage:report.stage,...value};
 }catch(error){report.latest={at:new Date().toISOString(),stage:report.stage,inspectionError:String(error?.message??error)};}finally{probePending=false;}
 if(log)await logLatest();
}
function check(latest){if(report.errors.length)throw Error('Browser error: '+report.errors.at(-1));if(latest?.alerts?.length)throw Error('UI alert: '+latest.alerts.join('; '));if(latest?.game?.status?.fault)throw Error('Simulation fault: '+JSON.stringify(latest.game.status.fault));if(['failed','error'].includes(latest?.surface?.phase)||latest?.surface?.state?.fault||latest?.surface?.terrain?.closed||latest?.client?.client?.fault)throw Error('Presentation failure: '+JSON.stringify({surface:latest?.surface,client:latest?.client}));}
async function run(){
 const fixture=JSON.parse(gunzipSync(await readFile(fixturePath)));if(fixture.biome!=='sabana'||!fixture.raid?.animals.some(actor=>actor.id===target))throw Error('Missing native savanna raid target');
 report.stage='launch';ticker=setInterval(()=>{(!page||probePending?logLatest():probe(true)).catch(error=>console.error('WG_QA_STATUS_ERROR',String(error)));},10000);browser=await chromium.launch({channel:'msedge',headless:process.env.QA_HEADFUL!=='1',timeout:remaining(),...(debugPort===null?{}:{args:[`--remote-debugging-port=${debugPort}`,'--remote-debugging-address=127.0.0.1']})});page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(remaining());page.on('pageerror',error=>report.errors.push(String(error)));
 await page.route('**/docs/guardian/phase2/performance-components/native-raid-snapshot.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture)}));
 report.stage='boot';await page.goto(base+'/?qa-worker-game&qa-worker-raid&qa-webgpu-world&qa-webgpu-all-actors&qa-webgpu-picking&qa-webgpu-causal-input&qa-webgpu-temporal&qa-webgpu-world-motion&qa-visibility&wildEngineThreads=0',{waitUntil:'domcontentloaded',timeout:remaining()});await probe(true);
 let ready=false;while(Date.now()<deadline){await probe();const value=report.latest;check(value);const q=value?.game,s=value?.surface,actor=value?.combatTarget;if(q?.screen==='game'&&q.status?.running&&s?.backend==='WebGPU'&&s.state?.sequence>0&&s.actors?.ready>0&&s.actors?.pending===0&&actor&&!['gone','retreating'].includes(actor.status)){ready=true;break;}await page.waitForTimeout(Math.min(500,remaining()));}
 if(!ready)throw Error('Global timeout waiting for game, presentation and target readiness');report.before={game:report.latest.game,render:report.latest.surface};if(report.before.render.device?.adapter?.isFallbackAdapter!==false)throw Error('Expected a real hardware WebGPU adapter');await page.screenshot({path:prefix+'-before.png',timeout:remaining()});
 report.stage='attack';await page.locator('[data-menu="magic"]').click({timeout:remaining()});await page.locator('[data-spell="attack"]').click({timeout:remaining()});await bounded(page.evaluate(id=>window.wildGuardiansWorkerAttackQa(id),target),remaining(),'Attack input');
 report.stage='impact';const baseline=report.before.render.actors?.historicalPhysical??{starts:0,samples:0,finishes:0},impactDeadline=Math.min(deadline,Date.now()+30000);while(Date.now()<impactDeadline){
  await probe();const value=report.latest;check(value);const frame={at:Date.now(),game:value?.game,render:value?.surface};report.frames.push(frame);const audit=frame.render?.poseAudit,counts=frame.render?.actors?.historicalPhysical;if(frame.render?.actors?.physicalApplied>0&&audit?.actorId===target)report.physicalObserved=true;if(audit?.historical===true&&audit.actorId===target&&audit.expectedBones===audit.visualBones&&Number.isFinite(audit.maxError)&&audit.maxError<=1e-6)report.historicalPoseObserved=true;if(report.physicalObserved&&report.historicalPoseObserved&&counts?.starts>baseline.starts&&counts.samples>baseline.samples&&counts.finishes>baseline.finishes)break;await page.waitForTimeout(Math.min(10,remaining()));
 }
 const finalCounts=report.frames.at(-1)?.render?.actors?.historicalPhysical;if(!report.physicalObserved||!report.historicalPoseObserved||!(finalCounts?.starts>baseline.starts&&finalCounts.samples>baseline.samples&&finalCounts.finishes>baseline.finishes))throw Error('Expected historical physical start/sample/finish and matching pose audit; normal fallback is insufficient');report.after=report.frames.at(-1);await page.screenshot({path:prefix+'-after.png',timeout:remaining()});report.stage='done';report.completed=true;report.scope='Unchanged native savanna raid and real player input. Pose audit uses the current discrete historical sample.';
}
try{
 await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`Global timeout after ${timeout} ms`)),timeout);})]);
}catch(error){report.error=String(error?.stack??error);throw error;}finally{
 clearTimeout(timer);clearInterval(ticker);try{if(page&&!report.completed)await page.screenshot({path:prefix+'-failure.png',timeout:2000});}catch{}try{await writeFile(prefix+'.json',JSON.stringify(report,null,2));}finally{await browser?.close();}
}

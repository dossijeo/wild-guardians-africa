import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));let patched=0;
 await page.route('**/tools/experiments/shared-native-world-preparation.js*',async route=>{const response=await route.fetch();let s=await response.text(),needle='export function prepareSharedNativeWorld(world,textures,cancelled){',tail='return owner.request(textures,cancelled);';if(!s.includes(needle)||!s.includes(tail))throw Error('Shared owner hook missing');s=s.replace(needle,needle+'globalThis.__qaSharedRoot=world.assetGroups.root;globalThis.__qaSharedRequests=(globalThis.__qaSharedRequests??0)+1;');s=s.replace(tail,"const promise=owner.request(textures,cancelled);promise.then(()=>{(globalThis.__qaSharedOutcomes??=[]).push({status:'fulfilled',at:performance.now()});},error=>{(globalThis.__qaSharedOutcomes??=[]).push({status:'rejected',name:error.name,at:performance.now()});});return promise;");patched++;await route.fulfill({response,body:s});});
 await page.route('**/tools/experiments/prepare-native-far-gpu.js*',async route=>{const response=await route.fetch();let s=await response.text(),needle='sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);';if(!s.includes(needle))throw Error('Fence hook missing');s=s.replace(needle,"if(globalThis.__qaHoldFence&&root===globalThis.__qaSharedRoot){globalThis.__qaFenceReached=true;await globalThis.__qaFenceGate;check();}"+needle);patched++;await route.fulfill({response,body:s});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',sfx:0,music:0})));
 await page.goto('http://127.0.0.1:5175/?qa-spatial-seed=712&qa-loading&qa-crop-spell-frame&spatialFar=1');await page.waitForSelector('#native-menu',{timeout:30000});await page.waitForFunction(()=>document.querySelector('#native-menu')?.contentWindow?.location.pathname.includes('/menu/'),null,{timeout:30000});
 const menu=page.frames().find(f=>f.url().includes('/menu/'));await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'manglares',culture:'mapungubwe'},location.origin));
 await page.waitForFunction(()=>globalThis.wildGuardiansSpatialQa?.()?.world&&document.querySelector('#stage[aria-busy="false"]'),null,{timeout:240000});
 const result=await page.evaluate(async()=>{
  const qa=globalThis.wildGuardiansSpatialQa(),w=qa.world,{pause,resume}=await import('/src/simulation/game.js'),{verifyGameContextRestore}=await import('/tools/experiments/spatial-thread-game-context-case.js');
  if(!qa.state.mangroveNetwork||!w.farVegetation?.adapters.length)throw Error('Native island mangroves and far vegetation required');
  pause(qa.state,'qa-context');w.farSharedPreparation=true;let release;globalThis.__qaFenceGate=new Promise(resolve=>release=resolve);globalThis.__qaHoldFence=true;globalThis.__qaFenceReached=false;
  const start=performance.now(),camera=w.camera.position.clone(),target=w.controls.target.clone();
  while(!globalThis.__qaFenceReached&&performance.now()-start<20000){await new Promise(requestAnimationFrame);const d=Math.min(60,(performance.now()-start)*.02);w.camera.position.x=camera.x+d;w.controls.target.x=target.x+d;}
  if(!globalThis.__qaFenceReached)throw Error('Shared preparation did not reach held fence');
  const requests=globalThis.__qaSharedRequests??0,epoch=w.glResourceEpoch.stats.epoch,lostAt={value:null};w.canvas.addEventListener('webglcontextlost',()=>{lostAt.value=performance.now();globalThis.__qaHoldFence=false;release();},{once:true});
  const recovery=await verifyGameContextRestore(w);resume(qa.state,'qa-context');
  return {requests,epoch,lostAt:lostAt.value,outcomes:globalThis.__qaSharedOutcomes??[],recovery,adapters:w.farVegetation.adapters.map(a=>({errors:a.stats.errors,pending:a.preparationStatus(),coverage:a.stats.coverage,prepared:a.stats.prepared})),sceneDisposed:w.disposed};
 });
 const cancelled=result.outcomes.filter(x=>x.status==='rejected'&&x.name==='AbortError'&&x.at>=result.lostAt).length,recovered=result.outcomes.filter(x=>x.status==='fulfilled'&&x.at>=result.lostAt).length;
 if(patched!==2||errors.length||result.requests<1||cancelled<result.requests||recovered<1||result.sceneDisposed||!result.recovery.worldUnchanged||result.adapters.some(a=>a.errors.length||a.prepared!==a.coverage))throw Error(JSON.stringify({patched,errors,result}));
 await writeFile('docs/guardian/gpu-animation/shared-world-context-loss.json',JSON.stringify({scope:'Real new-game native island mangroves with spatial far layer. QA enables shared preparation after loading, moves camera, and holds its upload before fence; context loss releases it. Existing full-world recovery check verifies native snapshot and renderer. Does not establish pixel parity or performance.',result},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}

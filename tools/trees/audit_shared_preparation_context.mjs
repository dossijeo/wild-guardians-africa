import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:320,height:240}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));let patched=0;
 await page.route('**/tools/experiments/prepare-native-far-gpu.js*',async route=>{
  const response=await route.fetch();let source=await response.text();const needle='sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);';
  if(!source.includes(needle))throw Error('Fence hook missing');
  source=source.replace(needle,"if(globalThis.__qaHoldFence){globalThis.__qaFenceReached=true;await globalThis.__qaFenceGate;check();}"+needle);patched++;await route.fulfill({response,body:source});
 });
 await page.goto('http://127.0.0.1:5175/tests/browser/shared-preparation-context.html');
 const result=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),{SharedNativePreparation}=await import('/tools/experiments/shared-native-preparation.js'),{prepareNativeFarGpu,nativeFarGpuRevision}=await import('/tools/experiments/prepare-native-far-gpu.js');
  const canvas=document.querySelector('#world'),renderer=new THREE.WebGLRenderer({canvas}),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,4/3,.1,50),root=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial({color:0x44aa66});
  renderer.setSize(320,240);camera.position.z=5;root.add(new THREE.Mesh(geometry,material));scene.add(root);const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('Context loss extension unavailable');
  let calls=0;const owner=new SharedNativePreparation((textures,cancelled)=>{calls++;return prepareNativeFarGpu(renderer,root,scene,camera,textures,{cancelled,ownedCompilation:true,ownedWaits:true,timeout:30000});});
  const wait=(condition,label)=>new Promise((resolve,reject)=>{const deadline=performance.now()+15000;function poll(){if(condition())return resolve();if(performance.now()>deadline)return reject(Error('Timeout: '+label));setTimeout(poll,10);}poll();});
  const startEpoch=nativeFarGpuRevision(renderer);let release;globalThis.__qaFenceGate=new Promise(resolve=>release=resolve);globalThis.__qaHoldFence=true;globalThis.__qaFenceReached=false;
  const cancelled=()=>nativeFarGpuRevision(renderer)!==startEpoch;
  const first=Promise.allSettled([owner.request([],cancelled),owner.request([],cancelled)]);
  await wait(()=>globalThis.__qaFenceReached,'pre-fence');const before={calls,epoch:nativeFarGpuRevision(renderer),lost:gl.isContextLost()};
  extension.loseContext();await wait(()=>gl.isContextLost()&&nativeFarGpuRevision(renderer)!==startEpoch,'context lost');const lostEpoch=nativeFarGpuRevision(renderer);release();const interrupted=await first;
  globalThis.__qaHoldFence=false;extension.restoreContext();await wait(()=>!gl.isContextLost()&&nativeFarGpuRevision(renderer)!==lostEpoch,'context restored');const restoredEpoch=nativeFarGpuRevision(renderer);
  const recovery=await Promise.allSettled([owner.request([],()=>false),owner.request([],()=>false)]);renderer.render(scene,camera);
  const debug=gl.getExtension('WEBGL_debug_renderer_info'),result={renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),before,lostEpoch,restoredEpoch,calls,interrupted:interrupted.map(x=>({status:x.status,name:x.reason?.name??null})),recovery:recovery.map(x=>({status:x.status,name:x.reason?.name??null})),contextLost:gl.isContextLost()};
  geometry.dispose();material.dispose();renderer.dispose();return result;
 });
 if(patched!==1||errors.length||result.before.calls!==1||result.calls!==2||result.interrupted.some(x=>x.status!=='rejected'||x.name!=='AbortError')||result.recovery.some(x=>x.status!=='fulfilled')||result.contextLost)throw Error(JSON.stringify({patched,errors,result}));
 await writeFile('docs/guardian/gpu-animation/shared-preparation-context-loss.json',JSON.stringify({scope:'Isolated WebGL scene, two same-turn subscribers. QA holds the first preparation after its upload draw and before the fence, then loses/restores the real context. Not a full game, tree visual parity or performance test.',result},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}

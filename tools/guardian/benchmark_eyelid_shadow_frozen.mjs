import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const output=process.env.OUTPUT_DIR??'docs/guardian/gpu-animation/eyelid-shadow-frozen',browser=await chromium.launch({channel:'msedge',headless:true});await mkdir(output,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?nativeRaid&biome=sabana&lightingReview&treeReview&recoveryDay&productionFarWarm&wildEngineThreads=0');
 await page.waitForFunction(()=>{try{return window.treeReview&&JSON.parse(document.querySelector('#status').textContent).combatPhysics}catch{return false;}},null,{timeout:180000});
 const cameraMode=process.env.QA_CAMERA??'fixture';
 const result=await page.evaluate(async cameraMode=>{
  const r=window.treeReview,w=r.world;if(r.authority!=='spatial-wasm')throw Error('Native world required');r.setManual(true);
  for(let i=0;i<600;i++){w.render(0);if([...w.mixers.values()].filter(d=>d.profile&&d.lod).length>=32)break;await new Promise(requestAnimationFrame);}
  const meshes=[];for(const rig of w.mixers.values())if(rig.profile)for(const root of [rig.model,rig.lod?.root])root?.traverse(o=>{if(o.isMesh&&o.name==='ActorFacialLids')meshes.push(o);});if(meshes.length!==64)throw Error('Expected 64 worker lid meshes, got '+meshes.length);
  const {Vector3}=await import('/node_modules/three/build/three.module.js');if(cameraMode==='worker-close'){const worker=r.state.workers.find(a=>a.id==='worker-6')??r.state.workers[0],y=w.nav.field.surface(worker.x,worker.z);w.setCameraExclusion(false);w.controls.target.set(worker.x,y+1.15,worker.z);w.camera.position.set(worker.x+3.7,y+2.9,worker.z+5.5);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};w.render(0);}else if(cameraMode!=='fixture')throw Error('Unknown camera mode');
  const visibleWorkers=[...w.mixers.values()].filter(d=>d.profile).filter(d=>{const p=d.model.getWorldPosition(new Vector3()).project(w.camera);return p.x>=-1&&p.x<=1&&p.y>=-1&&p.y<=1&&p.z>=-1&&p.z<=1;}).length;
  const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),draw=w.renderer.renderBufferDirect,counts={considered:0};
  w.renderer.renderBufferDirect=function(camera,scene,geometry,material,object,...rest){if(object.name==='ActorFacialLids'&&material.type==='MeshDepthMaterial'&&camera===w.sun.shadow.camera)counts.considered++;return draw.call(this,camera,scene,geometry,material,object,...rest);};
  const stats=a=>{const v=[...a].sort((x,y)=>x-y),n=v.length;return {count:n,mean:v.reduce((x,y)=>x+y,0)/n,p95:v[Math.floor((n-1)*.95)],p99:v[Math.floor((n-1)*.99)],max:v.at(-1)};};
  const timeStart=r.state.elapsed,cameraStart=w.camera.matrixWorld.toArray(),rows=[],pictures={},order=[false,true,true,false,true,false,false,true];
  const redraw=()=>{w.releaseNativeShadow?.cache?.invalidate();w.renderer.shadowMap.needsUpdate=true;w.drawWorldFrame();};
  try{for(const [block,skip] of order.entries()){
   for(const m of meshes)m.castShadow=!skip;for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);redraw();}
   const before=counts.considered,timer=new GpuTimer(gl,64),cpu=[],interval=[],draws=[];let last=null;
   try{for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const start=performance.now();if(last!==null)interval.push(start-last);last=start;const query=timer.begin(i);redraw();if(query)timer.end();timer.poll();cpu.push(performance.now()-start);draws.push(w.renderer.info.render.calls);}
    for(let i=0;i<60&&timer.pending.length;i++){await new Promise(requestAnimationFrame);timer.poll();}const gpu=timer.report();rows.push({block,skip,cpu:stats(cpu),interval:stats(interval),draws:stats(draws),depthDraws:counts.considered-before,gpu});
   }finally{timer.dispose();}
   if(block===0||block===1){const label=skip?'skipped':'original';redraw();pictures[label]=w.renderer.domElement.toDataURL('image/png');redraw();pictures[label+'Repeat']=w.renderer.domElement.toDataURL('image/png');if(skip){const oldShadow=w.sun.castShadow;try{w.sun.castShadow=false;redraw();pictures.negative=w.renderer.domElement.toDataURL('image/png');}finally{w.sun.castShadow=oldShadow;}}}
  }}finally{w.renderer.renderBufferDirect=draw;for(const m of meshes)m.castShadow=true;}
  const cameraEnd=w.camera.matrixWorld.toArray();if(r.state.elapsed!==timeStart||cameraStart.some((v,i)=>v!==cameraEnd[i]))throw Error('World time or camera changed');
  return {scope:'Frozen native savanna scene, 32 worker rigs and 64 original/LOD lid meshes; ABBA then BAAB in one page. Shadows explicitly invalidated each frame. No simulation, animation advance, physics, camera movement or resource loading in measured blocks. GPU timer includes full world draw and its shadow pass; browser intervals are callback intervals. Not a live gameplay benchmark.',authority:r.authority,biome:r.state.biome,network:r.state.mangroveNetwork??false,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),workers:[...w.mixers.values()].filter(d=>d.profile).length,visibleWorkers,cameraMode,meshes:meshes.length,elapsed:timeStart,rows,pictures,errors:r.errors};
 },cameraMode);
 if(errors.length||result.errors.length||result.rows.length!==8||result.rows.some(row=>row.cpu.count!==120||row.gpu.disjointEvents||row.gpu.pending||row.gpu.samples.length!==120||row.depthDraws!==(row.skip?0:3840)))throw Error(JSON.stringify({errors,result:{...result,pictures:undefined}}));
 for(const [name,data] of Object.entries(result.pictures))await writeFile(`${output}/${name}.png`,Buffer.from(data.split(',')[1],'base64'));delete result.pictures;
 await writeFile(`${output}/report.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({renderer:result.renderer,workers:result.workers,visibleWorkers:result.visibleWorkers,cameraMode:result.cameraMode,rows:result.rows.map(({gpu,...row})=>({...row,gpuSamples:gpu.samples.length}))}));
}finally{await browser.close();}

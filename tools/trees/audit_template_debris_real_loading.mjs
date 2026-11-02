import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],biome=process.env.REVIEW_BIOME??'manglares',enabled=process.env.TEMPLATE_WARM==='1';let injected=0;
 page.on('pageerror',e=>errors.push(String(e)));
 if(enabled)await page.route('**/src/rendering/scene.js*',async route=>{
  const response=await route.fetch();let source=await response.text();const needle="await phase('warm-compile-smoke',()=>this.destructionPass.prepareSmokePrograms(this.camera));if(this.disposed)return;";
  if(!source.includes(needle))throw Error('Missing loading hook');
  source=source.replace(needle,needle+`
   const qaTemplate=[...this.buildingTemplates.values()][0],qaBefore={centers:this.state.structures.filter(s=>s.kind==='center').length,buildings:this.destructionPass.buildings.size,opening:this.destructionPass.scene.children.length,smoke:this.destructionPass.smokeScene.children.length};
   if(!qaTemplate||qaBefore.centers)throw Error('Expected new game without a center and a loaded building template');
   let qaTemporary;const qaStart=performance.now();
   try{qaTemporary=new NativeBuilding(qaTemplate,{id:'qa-loading-primer',status:'intact',hp:1,maxHp:1},this.destructionPass,this.state.elapsed);
    await prepareDebrisProgram(this.renderer,this.scene,this.camera,qaTemporary.effects.debris,{compile,cancelled:()=>this.disposed||this.loading.signal.aborted});
    const material=qaTemporary.effects.debris.material,program=this.renderer.properties.get(material).currentProgram;
    if(!program)throw Error('Missing prepared program');qaTemporary.effects.debris.material=material.clone();qaTemporary.dispose();qaTemporary=null;
    globalThis.__qaTemplateDebris={material,program,world:this,before:qaBefore,after:{centers:this.state.structures.filter(s=>s.kind==='center').length,buildings:this.destructionPass.buildings.size,opening:this.destructionPass.scene.children.length,smoke:this.destructionPass.smokeScene.children.length},duration:performance.now()-qaStart};
   }finally{qaTemporary?.dispose();}
  `);injected++;await route.fulfill({response,body:source});
 });
 await page.addInitScript(()=>{localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',sfx:0,music:0}));window.qaTimes=[];let last=null;const tick=()=>{const now=performance.now();if(last!==null)window.qaTimes.push(now-last);last=now;requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 await page.goto('http://127.0.0.1:5175/?qa-spatial-seed=712&qa-loading&qa-crop-spell-frame');await page.waitForSelector('#native-menu',{timeout:30000});
 const menu=page.frames().find(f=>f.url().includes('/menu/'));if(!menu)throw Error('Menu unavailable');
 const start=Date.now();await menu.evaluate(b=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:b,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')||document.querySelector('.loading-failure'),null,{timeout:240000});
 const report=await page.evaluate(async({enabled})=>{
  const qa=globalThis.wildGuardiansSpatialQa?.();if(!qa?.world||document.querySelector('.loading-failure'))throw Error('Loading failed');const w=qa.world,primer=globalThis.__qaTemplateDebris;
  if(enabled&&!primer)throw Error('Primer missing');const frames=window.qaTimes.slice().sort((a,b)=>a-b),gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');let reuse=null,collapse;
  globalThis.__wildSpellFrameManual=true;
  try{
   const Game=await import('/src/simulation/game.js'),{hitStructure}=await import('/src/simulation/rules.js'),{GpuTimer}=await import('/tests/browser/gpu-timer.js');const state=qa.state,nav=w.nav,site=state.villages[0].center;
   if(!site)throw Error('Initial center location unavailable');Game.resume(state,'intro');if(!Game.placeStructure(state,'qa-real-center',site,nav))throw Error('Center placement rejected');
   const center=state.structures.find(s=>s.kind==='center');if(!center)throw Error('Center was not placed');const y=nav.field.surface(center.x,center.z);w.setCameraExclusion(false);w.controls.target.set(center.x,y+2,center.z);w.camera.position.set(center.x+15,y+16,center.z+20);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
   for(let i=0;i<20;i++){await new Promise(requestAnimationFrame);w.render(0,1/30);}
   const building=[...w.destructionPass.buildings].find(b=>b.entityId===center.id);if(!building)throw Error('Real building missing');if(!hitStructure(center,center.hp,state.elapsed,state))throw Error('Damage rejected');nav.setState(state);
   const timer=new GpuTimer(gl,128),rows=[];for(let i=0;i<80;i++){await new Promise(requestAnimationFrame);state.elapsed+=1/30;center.collapseRemaining=Math.max(0,center.collapseRemaining-1/30);timer.begin(i);const start=performance.now();try{w.render(0,1/30);}finally{timer.end();}rows.push({frame:i,renderMs:performance.now()-start,debris:building.effects.debris.geometry.instanceCount});}
   for(let i=0;i<120&&timer.pending.length;i++){await new Promise(resolve=>setTimeout(resolve,8));timer.poll();}const gpu=timer.report();timer.dispose();const program=w.renderer.properties.get(building.effects.debris.material).currentProgram;
   if(!program||!rows.some(row=>row.debris>0))throw Error('No real debris draw');reuse=primer?{sameProgram:program===primer.program,before:primer.before,after:primer.after,prepareMs:primer.duration}:null;collapse={rows,gpu,status:center.status,damage:building.damage,centerId:center.id};
  }finally{primer?.material.dispose();delete globalThis.__qaTemplateDebris;globalThis.__wildSpellFrameManual=false;}
  return {biome:qa.state.biome,network:qa.state.mangroveNetwork??false,centers:qa.state.structures.filter(s=>s.kind==='center').length,overlay:!!document.querySelector('#world-loading'),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),frames:{count:frames.length,p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames.at(-1)},reuse,collapse};
 },{enabled});
 if(errors.length||report.biome!==biome||report.overlay||enabled&&(!report.reuse?.sameProgram||JSON.stringify(report.reuse.before)!==JSON.stringify(report.reuse.after)||injected!==1))throw Error(JSON.stringify({report,errors,injected}));
 report.elapsedMs=Date.now()-start;report.scope='Actual new-game load, legal Game.placeStructure, then direct diagnostic damage and manually advanced collapse visual clock in a frozen game. QA-only injected preparation when enabled. GPU timings are whole world-render calls; loading RAF samples include menu. Not a full simulation, rendered-frame presentation, production integration or visual-equivalence test.';
 await writeFile(`docs/lighting/tree-near-retexture/performance/${biome}-template-debris-real-loading-${process.env.RUN_SUFFIX??'1'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({biome:report.biome,elapsedMs:report.elapsedMs,frames:report.frames,reuse:report.reuse,firstCollapse:report.collapse.rows[0],firstGpu:report.collapse.gpu.samples.find(s=>s.frame===0),gpuSamples:report.collapse.gpu.samples.length,gpuErrors:{disjoint:report.collapse.gpu.disjointEvents,skipped:report.collapse.gpu.overflowSkipped+report.collapse.gpu.foreignQuerySkipped}}));
}finally{await browser.close();}

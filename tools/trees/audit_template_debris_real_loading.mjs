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
  if(enabled&&!primer)throw Error('Primer missing');let reuse=null;
  if(primer){const {NativeBuilding}=await import('/src/rendering/buildings.js'),{prepareDebrisProgram}=await import('/src/rendering/debris-gpu-preload.js');let probe;try{probe=new NativeBuilding([...w.buildingTemplates.values()][0],{id:'qa-post-load-probe',status:'intact',hp:1,maxHp:1},w.destructionPass,w.state.elapsed);const start=performance.now();await prepareDebrisProgram(w.renderer,w.scene,w.camera,probe.effects.debris,{compile:(scene,camera,target)=>w.renderer.compileAsync(scene,camera,target)});reuse={sameProgram:w.renderer.properties.get(probe.effects.debris.material).currentProgram===primer.program,probeMs:performance.now()-start,before:primer.before,after:primer.after,prepareMs:primer.duration};}finally{probe?.dispose();primer.material.dispose();delete globalThis.__qaTemplateDebris;}}
  const frames=window.qaTimes.slice().sort((a,b)=>a-b),gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {biome:qa.state.biome,network:qa.state.mangroveNetwork??false,centers:qa.state.structures.filter(s=>s.kind==='center').length,overlay:!!document.querySelector('#world-loading'),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),frames:{count:frames.length,p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames.at(-1)},reuse};
 },{enabled});
 if(errors.length||report.biome!==biome||report.overlay||enabled&&(!report.reuse?.sameProgram||JSON.stringify(report.reuse.before)!==JSON.stringify(report.reuse.after)||injected!==1))throw Error(JSON.stringify({report,errors,injected}));
 report.elapsedMs=Date.now()-start;report.scope=enabled?'Actual new-game loading with an injected QA-only temporary building; post-load synthetic probe, no real center placement or destruction. RAF samples include the menu and probe. No GPU timer or production integration.':'Actual new-game loading control without injected preparation or synthetic probe. RAF samples include the menu. No GPU timer or production integration.';
 await writeFile(`docs/lighting/tree-near-retexture/performance/${biome}-template-debris-real-loading-${process.env.RUN_SUFFIX??'1'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}

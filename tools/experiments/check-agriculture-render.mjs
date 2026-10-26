import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {Matrix4,Vector3} from 'three';
const species=process.argv[2]??'rhino',out=process.env.WG_BEAST_QA_OUT??'docs/qa/mangrove-magic-20261026/agriculture/render',base=process.env.WG_QA_URL??'http://127.0.0.1:5217';
const viewport={width:Number(process.env.WG_QA_WIDTH??1280),height:Number(process.env.WG_QA_HEIGHT??720)};
await mkdir(out,{recursive:true});
const fixtureId=process.env.WG_BEAST_FIXTURE_ID??species;
const fixture=JSON.parse(await readFile(process.env.WG_MAGIC_FIXTURE??'docs/qa/mangrove-magic-20261026/agriculture/fixture.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport,recordVideo:{dir:out+'/raw',size:viewport}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));let report={species,fixtureId,group:fixture.group??[species],viewport,scope:fixture.scope};
let profiler;
const inspect=async()=>page.evaluate(()=>{const q=wildGuardiansVisibilityQa();return {...q,state:q.snapshot?JSON.parse(q.snapshot):null,snapshot:undefined};});
try {
 if(process.env.WG_MAGIC_PROFILE==='1')await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('this.raycaster=new','globalThis.qaMagicWorld=this;this.raycaster=new')});});
 if(process.env.WG_MAGIC_PROFILE==='1')await page.addInitScript(()=>{
  const sources=new WeakMap(),attached=new WeakMap();globalThis.qaMagicPrograms=[];
  const p=WebGL2RenderingContext.prototype,source=p.shaderSource,attach=p.attachShader,info=p.getProgramInfoLog;
  p.shaderSource=function(shader,text){sources.set(shader,text);return source.call(this,shader,text);};
  p.attachShader=function(program,shader){const list=attached.get(program)??[];list.push(shader);attached.set(program,list);return attach.call(this,program,shader);};
  p.getProgramInfoLog=function(program){const start=performance.now();try{return info.call(this,program);}finally{if(globalThis.qaMagicRecording)qaMagicPrograms.push({draw:globalThis.qaMagicDraw,start,ms:performance.now()-start,shaders:(attached.get(program)??[]).map(s=>sources.get(s))});}};
 });
 await page.addInitScript(f=>{localStorage.setItem('wild-guardians:slot:'+f.slotId,f.snapshot);localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',music:0,sfx:0}));},fixture);
 await page.goto(base+'/?qa-visibility'+(['0','1'].includes(process.env.WG_STABLE_LIGHTS)?'&vfxStableLights='+process.env.WG_STABLE_LIGHTS:''),{timeout:90000});const menu=page.frameLocator('#native-menu');
 await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});await menu.getByRole('button',{name:'Continuar',exact:true}).click();await menu.locator('[data-production-save="'+fixture.slotId+'"]').click();
 await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
 await page.waitForTimeout(2200);report.before=await inspect();
 if(await page.locator('.tutorial-close:visible').count())await page.locator('.tutorial-close:visible').first().click();
 if(process.env.WG_MAGIC_PROFILE==='1'){
  profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');
  await page.evaluate(()=>{const renderer=qaMagicWorld.renderer,draw=renderer.renderBufferDirect;renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){globalThis.qaMagicDraw={object:object.name,parents:[object.parent?.name,object.parent?.parent?.name],type:object.type,material:material.type,source:object.material?.name,side:material.side};try{return draw.call(this,camera,scene,geometry,material,object,group);}finally{globalThis.qaMagicDraw=null;}};globalThis.qaMagicFrames=[];globalThis.qaMagicLongTasks=[];let last=null;globalThis.qaMagicRecording=true;const frame=t=>{if(!qaMagicRecording)return;if(last!==null)qaMagicFrames.push({t,ms:t-last});last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);new PerformanceObserver(list=>{for(const e of list.getEntries())qaMagicLongTasks.push({start:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:false});});
 }
 await page.evaluate(async()=>{globalThis.qaGame=await import('/src/simulation/game.js');});
 await page.evaluate(()=>{const w=qaMagicWorld,p=w.state.plants[1],y=w.nav.field.surface(p.x,p.z);w.cinematic=true;w.controls.target.set(p.x,y,p.z);w.camera.position.set(p.x+5,y+7,p.z+10);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);});
 await page.waitForTimeout(1000);
 report.casts=[];
 for(let i=0;i<4;i++){
  const result=await page.evaluate(i=>{const w=qaMagicWorld,p=w.state.plants[i],kind=i%2?'multiply':'growth',start=performance.now();const accepted=qaGame.cast(w.state,'qa-render-'+i,kind,p.x,p.z,w.nav,p.id);return {kind,target:p.id,accepted,start,commandMs:performance.now()-start};},i);
  assert(result.accepted);report.casts.push(result);await page.waitForTimeout(2200);
  result.graphics=await page.evaluate(()=>[...qaMagicWorld.agricultureVfx.effects.values()].map(e=>({visible:e.visible,parent:!!e.parent,time:e.native.time,sprites:e.sprites.geometry.instanceCount,lights:e.localLights.length})));
  assert.equal(result.graphics.length,i+1);assert(result.graphics.some(e=>e.visible&&e.parent&&e.sprites>0));
  await page.screenshot({path:out+'/magic-'+i+'.png'});
 }
 report.after=await inspect();assert.equal(report.after.state.spells.length,4);
 report.ok=true;assert.deepEqual(errors,[]);

}catch(e){report.ok=false;report.failure=String(e);report.last=await inspect().catch(()=>null);await page.screenshot({path:out+'/raid-ui-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile(out+'/magic.cpuprofile',JSON.stringify(profile));report.timing=await page.evaluate(()=>{qaMagicRecording=false;return {frames:qaMagicFrames,longTasks:qaMagicLongTasks};});await writeFile(out+'/program-waits.json',JSON.stringify(await page.evaluate(()=>qaMagicPrograms)));}report.errors=errors;await writeFile(out+'/raid-ui.json',JSON.stringify(report,null,2));await context.close();await page.video().saveAs(out+'/raid-ui.webm');await browser.close();console.log(JSON.stringify({species,ok:report.ok,failure:report.failure}));}

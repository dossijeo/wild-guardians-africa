import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {Matrix4,Vector3} from 'three';
const species=process.argv[2]??'rhino',out=process.env.WG_BEAST_QA_OUT??'docs/qa/beast-integration-20261025/'+species,base=process.env.WG_QA_URL??'http://127.0.0.1:5217';
const viewport={width:Number(process.env.WG_QA_WIDTH??1280),height:Number(process.env.WG_QA_HEIGHT??720)};
await mkdir(out,{recursive:true});
const fixtureId=process.env.WG_BEAST_FIXTURE_ID??species;
const fixture=JSON.parse(await readFile(process.env.WG_BEAST_FIXTURE??('docs/qa/beast-integration-20261025/fixtures/'+fixtureId+'.json'),'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport,recordVideo:{dir:out+'/raw',size:viewport}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});let report={species,fixtureId,group:fixture.group??[species],viewport,scope:fixture.scope};
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
 await page.waitForFunction(()=>{const s=JSON.parse(wildGuardiansVisibilityQa().snapshot);return s.raid?.cameraFocusedAnimalId;},null,{timeout:90000});
 await page.waitForTimeout(2200);report.before=await inspect();report.biome=report.before.state?.biome;assert.equal(report.biome,JSON.parse(fixture.snapshot).biome);if(process.env.WG_EXPECT_BIOME)assert.equal(report.biome,process.env.WG_EXPECT_BIOME);await page.screenshot({path:out+'/raid-camera.png'});
 if(process.env.WG_BEAST_GROUP_OBSERVE==='1'){
  assert.equal(report.before.state.raid.animals.length,report.group.length,'Entire group must spawn');report.timeline=[];
  for(let i=0;i<8;i++){
   const q=await inspect(),projection=new Matrix4().fromArray(q.camera.projection),inverse=new Matrix4().fromArray(q.camera.inverse),r=q.camera.canvas;
   const actors=q.state.raid.animals.map(a=>{const visual=q.actors.find(v=>v.id===a.id),v=visual?.position?new Vector3(...visual.position).add(new Vector3(0,1,0)).applyMatrix4(inverse).applyMatrix4(projection):null;return {id:a.id,species:a.species,status:a.status,x:a.x,z:a.z,pathLength:a.path?.length??0,ready:visual?.ready,visible:visual?.visible,screen:v?{x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2,depth:v.z,inFrustum:Math.abs(v.x)<=1&&Math.abs(v.y)<=1&&Math.abs(v.z)<=1}:null};});
   report.timeline.push({elapsed:q.state.elapsed,focus:q.state.raid.cameraFocusedAnimalId,camera:q.camera,actors});
   if([0,3,7].includes(i))await page.screenshot({path:`${out}/group-${i}.png`});
   assert(actors.filter(a=>a.status!=='gone').every(a=>a.ready),'An active group member has no rig');
   await page.waitForTimeout(1500);
  }
 }
 if(await page.locator('.tutorial-close:visible').count())await page.locator('.tutorial-close:visible').first().click();
 if(process.env.WG_MAGIC_PROFILE==='1'){
  profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.start');
  await page.evaluate(()=>{const renderer=qaMagicWorld.renderer,draw=renderer.renderBufferDirect;renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){globalThis.qaMagicDraw={object:object.name,parents:[object.parent?.name,object.parent?.parent?.name],type:object.type,material:material.type,source:object.material?.name,side:material.side};try{return draw.call(this,camera,scene,geometry,material,object,group);}finally{globalThis.qaMagicDraw=null;}};globalThis.qaMagicFrames=[];globalThis.qaMagicLongTasks=[];globalThis.qaLightSamples=[];let last=null;globalThis.qaMagicRecording=true;const frame=t=>{if(!qaMagicRecording)return;if(last!==null)qaMagicFrames.push({t,ms:t-last});last=t;if(globalThis.qaMagicWorld){const l=qaMagicWorld.vfxLibrary;qaLightSamples.push({t,sources:[...l.instances].filter(e=>e.visible&&e.parent&&!e.stopped).reduce((n,e)=>n+e.localLights.filter(s=>s.visible&&s.intensity>0).length,0),activeSlots:l.worldLights?.filter(s=>s.intensity>0).length??0,contacts:[...qaMagicWorld.shieldVfx.effects.keys()].filter(k=>k.startsWith('block/')).length});}requestAnimationFrame(frame);};requestAnimationFrame(frame);new PerformanceObserver(list=>{for(const e of list.getEntries())qaMagicLongTasks.push({start:e.startTime,ms:e.duration});}).observe({type:'longtask',buffered:false});});
 }
 await page.locator('[data-menu="magic"]').click();await page.locator('[data-spell="shield"]').click();
 if(await page.locator('.tutorial-close:visible').count())await page.locator('.tutorial-close:visible').first().click();
 const q=await inspect(),a=q.state.raid?.animals[0];assert(a,'Raid animal missing');
 const candidates=(a.path??[]).filter(p=>Math.hypot(p.x-a.x,p.z-a.z)>=7);
 if(process.env.WG_SHIELD_PROTECT_CROPS==='1')candidates.unshift(...q.state.plants.filter(p=>p.alive).map(p=>({x:p.x,z:p.z})));
 for(const radius of [7,9])for(let i=0;i<16;i++)candidates.push({x:a.x+Math.cos(i*Math.PI/8)*radius,z:a.z+Math.sin(i*Math.PI/8)*radius});
 const projection=new Matrix4().fromArray(q.camera.projection),inverse=new Matrix4().fromArray(q.camera.inverse);
 // Crop ground level approximated by camera target terrain for pointer targeting;
 // success is checked against actual gameplay state, never by calling cast().
 const r=q.camera.canvas,points=candidates.map(p=>{const v=new Vector3(p.x,q.camera.target[1]-.18,p.z).applyMatrix4(inverse).applyMatrix4(projection);return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2,world:p};}).filter(p=>p.x>10&&p.x<viewport.width-10&&p.y>110&&p.y<viewport.height-10);
 const free=await page.evaluate(points=>points.filter(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS'),points);
 assert(free.length,'No ground target visible outside the HUD');report.attempts=[];
 for(const point of free.slice(0,8)){
  report.clickStart=await page.evaluate(()=>performance.now());await page.mouse.click(point.x,point.y);report.clickEnd=await page.evaluate(()=>performance.now());await page.waitForTimeout(150);const s=await inspect();report.attempts.push(point);
  if(s.state.spells.some(s=>s.kind==='shield'||s.type==='shield'||s.spell==='shield')){report.click=point;break;}
 }
 await page.waitForFunction(()=>JSON.parse(wildGuardiansVisibilityQa().snapshot).spells.some(s=>s.kind==='shield'||s.type==='shield'||s.spell==='shield'),null,{timeout:10000});
 await page.waitForTimeout(700);report.after=await inspect();await page.screenshot({path:out+'/raid-shield.png'});await page.waitForTimeout(Number(process.env.WG_SHIELD_OBSERVE_MS??5000));report.end=await inspect();await page.screenshot({path:out+'/raid-shield-end.png'});report.ok=true;assert.deepEqual(errors,[]);
}catch(e){report.ok=false;report.failure=String(e);report.last=await inspect().catch(()=>null);await page.screenshot({path:out+'/raid-ui-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{if(profiler){const {profile}=await profiler.send('Profiler.stop');await writeFile(out+'/magic.cpuprofile',JSON.stringify(profile));report.timing=await page.evaluate(()=>{qaMagicRecording=false;return {frames:qaMagicFrames,longTasks:qaMagicLongTasks,lights:qaLightSamples};});await writeFile(out+'/program-waits.json',JSON.stringify(await page.evaluate(()=>qaMagicPrograms)));}report.errors=errors;await writeFile(out+'/raid-ui.json',JSON.stringify(report,null,2));await context.close();await page.video().saveAs(out+'/raid-ui.webm');await browser.close();console.log(JSON.stringify({species,ok:report.ok,failure:report.failure}));}

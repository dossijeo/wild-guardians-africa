import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {Matrix4,Vector3} from 'three';
const species=process.argv[2]??'rhino',out=process.env.WG_BEAST_QA_OUT??'docs/qa/mangrove-magic-20261026/agriculture/render',base=process.env.WG_QA_URL??'http://127.0.0.1:5217';
const viewport={width:Number(process.env.WG_QA_WIDTH??1280),height:Number(process.env.WG_QA_HEIGHT??720)};
await mkdir(out,{recursive:true});
const fixtureId=process.env.WG_BEAST_FIXTURE_ID??species;
const fixture=JSON.parse(await readFile('docs/qa/mangrove-magic-20261026/agriculture/fixture.json','utf8'));
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
 await page.goto(base+'/?qa-visibility'+(process.env.WG_STABLE_LIGHTS==='1'?'&vfxStableLights=1':''),{timeout:90000});const menu=page.frameLocator('#native-menu');
 await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});await menu.getByRole('button',{name:'Continuar',exact:true}).click();await menu.locator('[data-production-save="'+fixture.slotId+'"]').click();
 await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
 await page.waitForTimeout(2200);report.before=await inspect();
 if(await page.locator('.tutorial-close:visible').count())await page.locator('.tutorial-close:visible').first().click();

 report.gpu=await page.evaluate(async()=>{
 const w=qaMagicWorld,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const debug=gl.getExtension('WEBGL_debug_renderer_info'),renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 if(!ext)return {supported:false,renderer};
 const original=w.drawRenderFrame,pending=[],gpu=[],cpu=[];let frames=0,disjoint=false,resolve,reject;
 const done=new Promise((a,b)=>{resolve=a;reject=b;}),timeout=setTimeout(()=>reject(Error('GPU query timeout')),30000);
 w.drawRenderFrame=function(...args){frames++;const measured=frames>60&&frames<=300;
  if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))throw Error('Existing GPU query');
  const q=measured?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const start=performance.now();
  try{return original.apply(this,args);}finally{
   if(measured)cpu.push(performance.now()-start);
   if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}
   if(gl.getParameter(ext.GPU_DISJOINT_EXT))disjoint=true;
   while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const query=pending.shift();gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}
   if(frames>=300&&!pending.length)resolve();
  }
 };
 try{await done;}finally{clearTimeout(timeout);w.drawRenderFrame=original;for(const q of pending)gl.deleteQuery(q);}
 return {supported:true,renderer,frames,gpu,cpu,disjoint,scope:'Whole drawRenderFrame, 60 warmup frames +240 queries; simulation remains active; no shield active.'};
 });
 report.after=await inspect();report.ok=true;assert.deepEqual(errors,[]);
}catch(e){report.ok=false;report.failure=String(e);process.exitCode=1;}
finally{report.errors=errors;await writeFile(out+'/gpu.json',JSON.stringify(report,null,2));await context.close();await browser.close();console.log(JSON.stringify({ok:report.ok,failure:report.failure,gpu:report.gpu?.supported,disjoint:report.gpu?.disjoint,renderer:report.gpu?.renderer}));}

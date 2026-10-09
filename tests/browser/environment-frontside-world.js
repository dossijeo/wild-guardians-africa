// QA only: unchanged native environment geometry. Not an asset or visual acceptance test.
import * as THREE from 'three';
import {WorldScene} from '../../src/rendering/scene.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {newGame} from '../../src/simulation/game.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {json} from '../../src/rendering/assets.js';
import {GpuTimer} from './gpu-timer.js';
const params=new URLSearchParams(location.search),biome=params.get('biome')??'sabana';
if(!['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'].includes(biome)||params.get('visual')!=='1'&&!['sabana','manglares'].includes(biome))throw Error('Timing cases are Sabana/Mangroves; all six biomes support visual QA');
const status=document.querySelector('#status'),report=document.querySelector('#report'),run=document.querySelector('#run'),close=document.querySelector('#close');
const output={scope:'Native medium-quality static environment; original biome props only. No geometry repair, asset promotion or visual acceptance. No crops/workers. Fixed seed 712 and daytime 120. Shadow cache disabled equally. Total GPU includes native sky and main render; shadow and main-color queried on different frames from total. Explicit depth capture is a separate synthetic VFX-demand pass, not included in baseline total. Timings are not additive.',biome,blocks:[],errors:[]};
const publish=()=>report.textContent=JSON.stringify(output,null,2),assert=(v,m)=>{if(!v)throw Error(m);},raf=()=>new Promise(requestAnimationFrame);
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,'0')).join('');
addEventListener('unhandledrejection',e=>{output.errors.push(String(e.reason?.stack??e.reason));status.textContent='Failed';publish();});
const state=newGame({biome,culture:'mapungubwe',seed:712,slotId:'environment-culling-qa'});state.time=120;state.initialPreparation=false;state.tutorial.step='done';
const pack=await json('/content/biome-'+BIOME_IDS[biome]+'.json'),village=(await json('/content/villages.json')).find(v=>v.id===state.culture),nav=new Navigation(state.seed,biome,pack.profile);nav.setState(state);
const world=new WorldScene(document.querySelector('#world'),()=>{});world.onError=e=>{output.errors.push(String(e));publish();};world.pixelRatioLimit=1;world.qualitySetting('media');await world.load(state,nav,village);
const renderer=world.renderer,gl=renderer.getContext();world.releaseNativeShadow.cache.enabled=false;world.controls.enableDamping=false;world.raidCamera?.beginManual();
const y=nav.field.surface(96,96);world.controls.target.set(96,y+2,96);world.camera.position.set(116,y+22,136);world.controls.update();
world.render(0);await world.whenChunksReady();for(let i=0;!world.actorsReady();i++){assert(i<1200,'Actors readiness timeout');await raf();world.render(0);}await Promise.all([...world.assets.cache.values()]);
for(let i=0;i<90;i++){await raf();world.render(0);}await world.whenChunksReady();
const materials=[...new Set(world.prototypes.flat().map(m=>m.material))],saved=materials.map(m=>({m,side:m.side,shadowSide:m.shadowSide}));
assert(saved.every(s=>s.side===THREE.FrontSide&&s.shadowSide===THREE.FrontSide),'Expected production FrontSide props');
const identity=()=>JSON.stringify({camera:world.camera.position.toArray(),target:world.controls.target.toArray(),chunks:[...world.chunks.keys()].sort(),color:[...world.assetGroups.colors].map(([k,g])=>[k,g.mesh.geometry.uuid,g.mesh.count,g.mesh.instanceMatrix.version]),shadow:[...world.assetGroups.shadows].map(([k,g])=>[k,g.mesh.geometry.uuid,g.mesh.count,g.mesh.instanceMatrix.version])});
const invariant=identity(),logical=serialize(state),debug=gl.getExtension('WEBGL_debug_renderer_info');
output.context={seed:712,time:state.time,sourceLogicalSha256:await hash(logical),camera:world.camera.position.toArray(),target:world.controls.target.toArray(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,assets:pack.assets.map((a,i)=>({slot:i,name:a.name,group:a.group,lods:a.lods.length})),color:[...world.assetGroups.colors].map(([key,g])=>({key,instances:g.mesh.count,triangles:(g.mesh.geometry.index?.count??g.mesh.geometry.attributes.position.count)/3*g.mesh.count})),shadow:[...world.assetGroups.shadows].map(([key,g])=>({key,instances:g.mesh.count,triangles:(g.mesh.geometry.index?.count??g.mesh.geometry.attributes.position.count)/3*g.mesh.count})),originalSides:saved.map(s=>({side:s.side,shadowSide:s.shadowSide??null}))};
assert(output.context.color.length>0&&output.context.shadow.length>0,'No visible/casting environment');
let front=true,passTimers=null,insideMain=false,colorActive=false,shadowCalls=0,proxyTouched=0;
// Native shadow adapter borrows a private solid material. Change only that
// temporary prop material when its detached group enters the scene; restore it
// after the shadow traversal. Buildings/terrain/sky materials never participate.
const originalAdd=world.scene.add,originalShadow=renderer.shadowMap.render,originalRender=renderer.render,borrowed=new Map();
world.scene.add=function(...objects){for(const object of objects)if(object.name==='native_asset_shadow_pass')for(const mesh of object.children){const m=mesh.material;if(!borrowed.has(m))borrowed.set(m,{side:m.side,shadowSide:m.shadowSide});m.side=front?THREE.FrontSide:THREE.DoubleSide;m.shadowSide=m.side;proxyTouched++;}return originalAdd.apply(this,objects);};
renderer.shadowMap.render=function(...args){const timed=insideMain&&passTimers;if(timed){assert(passTimers.shadow.begin(passTimers.frame),'Shadow query begin');shadowCalls++;}try{return originalShadow.apply(this,args);}finally{for(const [m,s] of borrowed){m.side=s.side;m.shadowSide=s.shadowSide;}borrowed.clear();if(timed){passTimers.shadow.end();assert(passTimers.color.begin(passTimers.frame),'Color query begin');colorActive=true;}}};
renderer.render=function(scene,...args){const main=scene===world.scene&&renderer.getRenderTarget()===null;if(main)insideMain=true;try{return originalRender.call(this,scene,...args);}finally{if(main){insideMain=false;if(colorActive){passTimers.color.end();colorActive=false;}}}};
function arm(value){front=value;for(const s of saved){s.m.side=value?THREE.FrontSide:THREE.DoubleSide;s.m.shadowSide=s.m.side;s.m.needsUpdate=true;}}
function restoreProduction(){front=true;for(const s of saved){s.m.side=s.side;s.m.shadowSide=s.shadowSide;s.m.needsUpdate=true;}}
function witness(){
 const original=renderer.renderBufferDirect,rows=[],colorObjects=new Set([...world.assetGroups.colors.values()].map(g=>g.mesh)),shadowObjects=new Set([...world.assetGroups.shadows.values()].map(g=>g.mesh));
 for(const group of world.chunks.values())for(const b of group.userData.lodBatches??[]){b.meshes.forEach(m=>colorObjects.add(m));shadowObjects.add(b.shadow);}
 renderer.renderBufferDirect=function(camera,scene,geometry,material,object,...args){const value=original.call(this,camera,scene,geometry,material,object,...args);const pass=colorObjects.has(object)?'color':shadowObjects.has(object)?'shadow':null;if(pass)rows.push({pass,object:object.uuid,side:material.side,cull:gl.isEnabled(gl.CULL_FACE),cullMode:gl.getParameter(gl.CULL_FACE_MODE),frontFace:gl.getParameter(gl.FRONT_FACE)});return value;};
 try{world.render(0);}finally{renderer.renderBufferDirect=original;}
 for(const pass of ['color','shadow']){const selected=rows.filter(r=>r.pass===pass);assert(selected.length>0,'Missing '+pass+' culling witness');assert(selected.every(r=>r.cull===front&&(!front||r.cullMode===gl.BACK&&r.frontFace===gl.CCW)),'Actual GL culling differs from requested arm');}
 return rows;
}
async function warm(n){for(let i=0;i<n;i++){await raf();assert(!document.hidden,'Visible tab required');world.render(0);}world.destructionPass.captureDepth(world.camera,world.scene);}
const summarize=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,median:(s[(s.length-1)>>1]+s[s.length>>1])/2,p95:s[Math.ceil(s.length*.95)-1]};};
function valid(timer,count){const r=timer.report();assert(r.pending===0&&r.samples.length===count&&!r.disjointEvents&&!r.discarded&&!r.overflowSkipped&&!r.foreignQuerySkipped&&!r.allocationFailures,'Invalid elapsed query samples');return r;}
const visualButtons=['double','front','near','opposite'].map(id=>document.querySelector('#'+id));
async function visualArm(value){assert(!output.running,'Benchmark active');arm(value);await warm(45);output.visualArm=value?'FrontSide':'DoubleSide';output.visualCamera=world.camera.position.toArray();output.visualTarget=world.controls.target.toArray();output.visualWitness=witness();status.textContent=biome+': '+output.visualArm;publish();}
document.querySelector('#double').onclick=()=>visualArm(false);document.querySelector('#front').onclick=()=>visualArm(true);
async function nearView(opposite){assert(!output.running,'Benchmark active');run.disabled=true;const trees=[];for(const group of world.chunks.values())for(const b of group.userData.lodBatches??[])if(b.slot<4)for(const p of b.instances)trees.push({p,b});trees.sort((a,b)=>Math.hypot(a.p.x-96,a.p.z-96)-Math.hypot(b.p.x-96,b.p.z-96));const {p,b}=trees[0];const height=b.levels[0].geometry.boundingBox.getSize(new THREE.Vector3()).y*p.sy,distance=Math.max(10,height*1.9),sign=opposite?-1:1;world.controls.target.set(p.x,p.y+height*.45,p.z);world.camera.position.set(p.x+sign*distance*.65,p.y+height*.75,p.z+sign*distance);world.controls.update();world.render(0);await world.whenChunksReady();await visualArm(front);output.visualTree={slot:b.slot,name:pack.assets[b.slot].name,position:[p.x,p.y,p.z],height};publish();}
document.querySelector('#near').onclick=()=>nearView(false);document.querySelector('#opposite').onclick=()=>nearView(true);
status.textContent='Ready: '+biome;run.disabled=params.get('visual')==='1';close.disabled=false;visualButtons.forEach(b=>b.disabled=false);output.ready=true;output.productionFrontSide=true;publish();
close.onclick=()=>{assert(!output.running,'Cannot close during benchmark');world.scene.add=originalAdd;renderer.shadowMap.render=originalShadow;renderer.render=originalRender;restoreProduction();world.dispose();output.disposed=world.disposed;output.contextLost=gl.isContextLost();status.textContent='GPU closed';close.disabled=true;run.disabled=true;publish();};
run.onclick=async()=>{run.disabled=true;close.disabled=true;visualButtons.forEach(b=>b.disabled=true);output.running=true;output.startedAt=new Date().toISOString();try{
 output.witnesses=[];for(const value of [false,true]){arm(value);await warm(45);output.witnesses.push({arm:value?'B':'A',draws:witness()});}
 for(const [block,letter] of [...'ABBABAAB'].entries()){
  arm(letter==='B');await warm(45);status.textContent=`${biome}: ${letter} ${block+1}/8`;
  const timers=Object.fromEntries(['total','color','shadow','depth'].map(k=>[k,new GpuTimer(gl,64)]));assert(Object.values(timers).every(t=>t.report().supported),'Timer queries unavailable');
  const cpu=[],submissions=[];shadowCalls=proxyTouched=0;
  for(let frame=0;frame<120;frame++){
   await raf();assert(!document.hidden,'Tab hidden');assert(identity()===invariant,'Camera/chunks/instance inputs changed');
   const start=performance.now();
   if(frame%2===0){assert(timers.total.begin(frame),'Total query begin');world.render(0);timers.total.end();}
   else{passTimers={...timers,frame};try{world.render(0);}finally{passTimers=null;}}
   cpu.push(performance.now()-start);
   if(frame===0)submissions.push({...renderer.info.render,shadow:{...world.releaseAssetShadows.stats}});
  }
  // VFX demand is deliberately isolated from normal total/color/shadow frames.
  for(let frame=0;frame<30;frame++){await raf();assert(!document.hidden,'Tab hidden');assert(timers.depth.begin(frame),'Depth query begin');world.destructionPass.captureDepth(world.camera,world.scene);timers.depth.end();}
  for(let i=0;i<180&&Object.values(timers).some(t=>t.report().pending);i++){await raf();for(const t of Object.values(timers))t.poll();}
  const gpu=Object.fromEntries(Object.entries(timers).map(([k,t])=>[k,valid(t,k==='depth'?30:60)]));for(const t of Object.values(timers))t.dispose();
  assert(shadowCalls===60&&proxyTouched>0,'Missing native shadow instrumentation');assert(identity()===invariant&&serialize(state)===logical,'Logical/scene inputs changed');
  output.blocks.push({block,arm:letter,gpu,summaries:Object.fromEntries(Object.entries(gpu).map(([k,v])=>[k,summarize(v.samples.map(s=>s.ms))])),cpuSubmission:summarize(cpu),shadowCalls,proxyTouched,submissions});publish();
 }
 output.summary=Object.fromEntries(['total','color','shadow','depth'].map(pass=>{const a=output.blocks.filter(b=>b.arm==='A').flatMap(b=>b.gpu[pass].samples.map(s=>s.ms)),b=output.blocks.filter(b=>b.arm==='B').flatMap(b=>b.gpu[pass].samples.map(s=>s.ms));const A=summarize(a),B=summarize(b);return [pass,{A,B,savedMs:A.mean-B.mean,savedPercent:100*(A.mean-B.mean)/A.mean,pairs:output.blocks.filter((_,i)=>i%2===0).map((entry,i)=>{const next=output.blocks[i*2+1],aa=entry.arm==='A'?entry:next,bb=entry.arm==='B'?entry:next;return {order:entry.arm+next.arm,savedMs:aa.summaries[pass].mean-bb.summaries[pass].mean};})}];}));
 output.glError=gl.getError();assert(output.glError===0&&!output.errors.length,'Native rendering errors');output.completed=true;output.finishedAt=new Date().toISOString();status.textContent='Complete: original materials restored';
 }catch(e){output.errors.push(String(e.stack??e));status.textContent='Failed: '+e;}finally{passTimers=null;restoreProduction();world.render(0);output.running=false;output.restored=identity()===invariant&&serialize(state)===logical&&saved.every(s=>s.m.side===s.side&&s.m.shadowSide===s.shadowSide);close.disabled=false;visualButtons.forEach(b=>b.disabled=false);publish();}};
addEventListener('pagehide',()=>{if(!world.disposed)world.dispose();},{once:true});

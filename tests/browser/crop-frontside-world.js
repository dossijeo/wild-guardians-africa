// Companion QA: production WorldScene, frozen archived dense farm. No geometry repair.
import * as THREE from 'three';
import {WorldScene} from '../../src/rendering/scene.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {json} from '../../src/rendering/assets.js';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {GpuTimer} from './gpu-timer.js';
const button=document.querySelector('#run'),status=document.querySelector('#status'),report=document.querySelector('#report');
const output={scope:'Full native WorldScene, frozen archived day101 Sabana/Mapungubwe farm (1122 live crops). Only original crop sides change. QA time=120 for daylight, fixed overview camera, shadow cache disabled equally to measure regenerated shadows. No simulation advances, hiring, persistence, visual validation or production changes.',blocks:[],errors:[]};
const publish=()=>report.textContent=JSON.stringify(output,null,2),assert=(v,m)=>{if(!v)throw Error(m);},raf=()=>new Promise(requestAnimationFrame),hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,'0')).join('');
addEventListener('unhandledrejection',e=>{output.errors.push(String(e.reason?.stack??e.reason));status.textContent='Failed: '+e.reason;publish();});
const response=await fetch('/.cache/crop-frontside-world-state.bin');assert(response.ok,'Copy archived gzip bytes to .cache/crop-frontside-world-state.bin first');
const compressed=await response.arrayBuffer();const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
const state=deserialize(raw);state.time=120;const pack=await json('/content/biome-'+BIOME_IDS[state.biome]+'.json'),payload=(await json('/content/villages.json')).find(v=>v.id===state.culture),nav=new Navigation(state.seed,state.biome,pack.profile);nav.setState(state);
const world=new WorldScene(document.querySelector('#world'),()=>{});world.onError=e=>{output.errors.push(String(e));publish();};world.qualitySetting('media');await world.load(state,nav,payload);
const renderer=world.renderer,gl=renderer.getContext();renderer.setPixelRatio(1);renderer.setSize(1280,720,false);world.releaseNativeShadow.cache.enabled=false;
const live=state.plants.filter(p=>p.alive),x=(Math.min(...live.map(p=>p.x))+Math.max(...live.map(p=>p.x)))/2,z=(Math.min(...live.map(p=>p.z))+Math.max(...live.map(p=>p.z)))/2,y=nav.field.surface(x,z);
world.controls.enableDamping=false;world.controls.target.set(x,y,z);world.camera.position.set(x+55,y+60,z+80);world.controls.update();world.raidCamera?.beginManual();
world.render(0);await world.whenChunksReady();for(let i=0;!world.actorsReady();i++){assert(i<1200,'Actors not ready');await raf();world.render(0);}await Promise.all([...world.assets.cache.values()]);
for(let i=0;i<60;i++){await raf();world.render(0);}await world.whenChunksReady();
const meshes=[];world.scene.traverse(m=>{if(m.isInstancedMesh&&(m.geometry.attributes.iGrowth||m.geometry.attributes.iBridge))meshes.push(m);});assert(meshes.length===72,'Native crop pool expected');
const saved=meshes.map(m=>({m,side:m.material.side,shadowSide:m.material.shadowSide,depthSide:m.customDepthMaterial.side}));assert(saved.every(s=>s.side===THREE.DoubleSide&&s.shadowSide===THREE.DoubleSide&&s.depthSide===THREE.DoubleSide),'Original DoubleSide baseline');
const invariant=()=>JSON.stringify(meshes.map(m=>[m.uuid,m.geometry.uuid,m.count,m.instanceMatrix.version,m.geometry.attributes.iGrowth?.version??m.geometry.attributes.iBridge.version]));const cropInvariant=invariant(),logical=serialize(state);
const identity=()=>JSON.stringify({camera:world.camera.position.toArray(),target:world.controls.target.toArray(),chunks:[...world.chunks.keys()].sort(),crops:invariant()});const sceneInvariant=identity();
const debug=gl.getExtension('WEBGL_debug_renderer_info');output.context={plants:live.length,workers:state.workers.length,biome:state.biome,culture:state.culture,inputSha256:await hash(raw),logicalSha256:await hash(logical),camera:world.camera.position.toArray(),target:world.controls.target.toArray(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],dpr:devicePixelRatio,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,cropMeshes:meshes.length,inventory:meshes.map(m=>({name:m.name,count:m.count,triangles:(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count}))};
function arm(front){for(const s of saved){s.m.material.side=front?THREE.FrontSide:s.side;s.m.material.shadowSide=front?THREE.FrontSide:s.shadowSide;s.m.customDepthMaterial.side=front?THREE.FrontSide:s.depthSide;s.m.material.needsUpdate=true;s.m.customDepthMaterial.needsUpdate=true;}}
async function warm(n){for(let i=0;i<n;i++){await raf();assert(!document.hidden,'Visible tab required');world.render(0);}}
const summarize=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,median:(s[(s.length-1)>>1]+s[s.length>>1])/2,p95:s[Math.ceil(s.length*.95)-1]};};
status.textContent='Ready: native dense farm';button.disabled=false;publish();
button.onclick=async()=>{button.disabled=true;output.startedAt=new Date().toISOString();try{
 for(const front of [false,true]){arm(front);await warm(30);}
 for(const [block,letter] of [...'ABBABAAB'].entries()){
  arm(letter==='B');await warm(30);const timer=new GpuTimer(gl,64);assert(timer.report().supported,'GPU elapsed queries unavailable');const submissions=[];const originalAutoReset=renderer.info.autoReset;renderer.info.autoReset=false;status.textContent=`Full world ${letter}: block ${block+1}/8`;
  for(let frame=0;frame<90;frame++){await raf();assert(!document.hidden,'Hidden tab');assert(identity()===sceneInvariant,'Scene/crops/camera changed');renderer.info.reset();assert(timer.begin(frame),'Query begin failed');world.render(0);timer.end();if(frame===0)submissions.push({...renderer.info.render});}
  renderer.info.autoReset=originalAutoReset;for(let i=0;i<120&&timer.report().pending;i++){await raf();timer.poll();}const gpu=timer.report();assert(gpu.pending===0&&gpu.samples.length===90&&!gpu.disjointEvents&&!gpu.discarded&&!gpu.overflowSkipped&&!gpu.foreignQuerySkipped&&!gpu.allocationFailures,'Invalid query block');timer.dispose();assert(serialize(state)===logical&&invariant()===cropInvariant,'Logical state or crop geometry changed');
  output.blocks.push({block,arm:letter,summary:summarize(gpu.samples.map(s=>s.ms)),submissions,gpu});publish();
 }
 const A=summarize(output.blocks.filter(b=>b.arm==='A').flatMap(b=>b.gpu.samples.map(s=>s.ms))),B=summarize(output.blocks.filter(b=>b.arm==='B').flatMap(b=>b.gpu.samples.map(s=>s.ms)));output.summary={A,B,savedMs:A.mean-B.mean,savedPercent:100*(A.mean-B.mean)/A.mean,paired:output.blocks.reduce((p,b,i)=>{if(i%2===0){const next=output.blocks[i+1],a=b.arm==='A'?b:next,bb=b.arm==='B'?b:next;p.push({order:b.arm+next.arm,savedMs:a.summary.mean-bb.summary.mean,savedPercent:100*(a.summary.mean-bb.summary.mean)/a.summary.mean});}return p;},[])};output.finishedAt=new Date().toISOString();output.glError=gl.getError();assert(output.glError===0,'GL error');assert(!output.errors.length,'Native errors');output.completed=true;status.textContent='Complete: originals restored';
 }catch(e){output.errors.push(String(e.stack??e));status.textContent='Failed: '+e;}finally{arm(false);world.render(0);output.restored=saved.every(s=>s.m.material.side===s.side&&s.m.material.shadowSide===s.shadowSide&&s.m.customDepthMaterial.side===s.depthSide)&&serialize(state)===logical&&identity()===sceneInvariant;publish();}};
addEventListener('pagehide',()=>world.dispose(),{once:true});

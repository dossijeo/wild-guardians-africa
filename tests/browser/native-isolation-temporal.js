import * as Game from '../../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {findInitialLocationAsync} from '../../src/world/villages.js';
import {WorldScene} from '../../src/rendering/scene.js';
import {farVegetationProfile} from '../../src/rendering/far-vegetation-profile.js';
import {prepareInitialFarWorld} from '../../src/app/far-world-loading.js';
import {json} from '../../src/rendering/assets.js';
import {serialize,deserialize} from '../../src/persistence/snapshots.js';
import {Vector4} from 'three';
import {withGpuRootIsolation} from '../../tools/experiments/isolated-gpu-root.js';

const status=document.querySelector('#status'),rows=[],errors=[];
let active,cancelled=false;
const assert=(value,message)=>{if(!value)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function close(){if(!active)return;const world=active,gl=world.renderer.getContext();active=null;world.dispose();return {disposed:world.disposed,contextLost:gl.isContextLost()};}
function check(){if(cancelled)throw new DOMException('QA cancelled','AbortError');}
addEventListener('pagehide',()=>{cancelled=true;close();},{once:true});
document.querySelector('#cancel').onclick=()=>{cancelled=true;close();};
function pixels(renderer){const gl=renderer.getContext(),data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;}
function delta(a,b){assert(a.length===b.length,'Different framebuffer sizes');let channels=0,maxByte=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)channels++;if(d>maxByte)maxByte=d;}return{channels,maxByte};}

// All three draws are synchronous. No worker adoption or await can change the
// scene between reference and isolated draw. Mixer/clock advancement occurs
// before this witness; subsequent render(0) preserves that exact pose.
function witness(world){
 const renderer=world.renderer,root=world.assetGroups.root;
 world.render(0);const preliminary=pixels(renderer);world.render(0);
 const reference=pixels(renderer),visibility=new Map(),culling=new Map();
 world.scene.traverse(o=>{visibility.set(o,o.visible);if(o.isMesh)culling.set(o,o.frustumCulled);});
 const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear;
 const shadow={enabled:renderer.shadowMap.enabled,autoUpdate:renderer.shadowMap.autoUpdate,needsUpdate:renderer.shadowMap.needsUpdate},shadowMap=world.sun.shadow.map,shadowTexture=shadowMap?.depthTexture;
 try{renderer.autoClear=false;renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);withGpuRootIsolation(renderer,root,world.scene,()=>renderer.render(world.scene,world.camera));}
 finally{renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
 const upload=delta(reference,pixels(renderer));
 for(const [o,value] of visibility)assert(o.visible===value,'Visibility changed');for(const [o,value] of culling)assert(o.frustumCulled===value,'Culling changed');
 for(const [key,value] of Object.entries(shadow))assert(renderer.shadowMap[key]===value,'Shadow scheduling changed '+key);
 assert(world.sun.shadow.map===shadowMap&&world.sun.shadow.map?.depthTexture===shadowTexture,'Borrowed shadow resource changed');
 world.render(0);const next=delta(reference,pixels(renderer));
 assert(upload.channels===0,'Zero-pixel upload changed framebuffer');
 return{baselineNextFrame:delta(preliminary,reference),framebufferAfterUpload:upload,nextWorldFrame:next,flagsRestored:true,shadowOn:world.toon.shadowUniforms.uNativeShadowOn.value};
}
async function archived(){
 const response=await fetch('/docs/qa/intensive-gran-rio-suajili-e461b550/state.json.gz');assert(response.ok,'Dense fixture unavailable');
 const bytes=await response.arrayBuffer(),signature=new Uint8Array(bytes,0,2);
 const text=signature[0]===31&&signature[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);
 return deserialize(text);
}
async function runCase({biome,culture,dense=false}){
 check();const state=dense?await archived():Game.newGame({seed:712,biome,culture});check();
 assert(state.biome===biome&&state.culture===culture,'Fixture configuration differs');
 const pack=await json('/content/biome-'+BIOME_IDS[biome]+'.json'),payload=(await json('/content/villages.json')).find(v=>v.id===(culture==='saheliana'?'saheliano':culture));check();
 const nav=new Navigation(state.seed,biome,pack.profile),site=dense?null:await findInitialLocationAsync(nav,payload);check();
 if(site){Object.assign(state.villages[0],site);state.suppressed.push(...site.suppress);}nav.setState(state);Game.pause(state,'qa');state.tutorial.step='done';const logical=serialize(state);
 const canvas=document.createElement('canvas');document.querySelector('canvas').replaceWith(canvas);
 const world=active=new WorldScene(canvas,()=>{}),row={biome,culture,dense,samples:[],captures:[]};world.onError=e=>errors.push(String(e));world.pixelRatioLimit=1;world.qualitySetting('media');
 // Exercise the real async preparation path as well as per-frame restoration.
 // This remains a QA option; production defaults are unchanged.
 world.farIsolatedPreparation=true;
 try{
  await world.load(state,nav,payload,{farVegetation:farVegetationProfile({quality:'media',biome:nav.config.biome})});check();await prepareInitialFarWorld(world);check();
  const actors=[...world.objects.values()].map(o=>o.userData.actorReady).filter(Boolean);await Promise.all(actors);check();
  world.focusFarm();world.controls.enabled=false;world.controls.enableDamping=false;world.render(0);
  row.actorReadiness=actors.length;row.mixers=world.mixers.size;row.initialStream=world.chunkStream.summary();row.livingPlants=state.plants.filter(p=>p.alive).length;
  const eye=world.camera.position.clone(),target=world.controls.target.clone(),duration=10000,distance=120;
  let start,last,sampled=-1;
  while(true){
   const now=await frame();check();if(start===undefined){start=now;last=now;}const elapsed=Math.min(duration,now-start),fraction=elapsed/duration;
   world.camera.position.copy(eye);world.camera.position.z+=distance*fraction;world.controls.target.copy(target);world.controls.target.z+=distance*fraction;
   world.render(Math.min(.1,Math.max(0,(now-last)/1000)));last=now;
   const index=Math.floor(elapsed/500);
   if(index!==sampled){sampled=index;const sample={elapsed,distance:distance*fraction,...witness(world),chunks:world.chunks.size,created:world.chunkStream.stats.created};row.samples.push(sample);
    if(index===0||index===10||elapsed===duration)row.captures.push({elapsed,png:canvas.toDataURL('image/png')});
   }
   if(elapsed===duration)break;
  }
  row.finalStream=world.chunkStream.summary();row.logicalUnchanged=logical===serialize(state);assert(row.logicalUnchanged,'Paused logical state changed');row.distance=distance;
 }finally{const gl=world.renderer.getContext();close();row.cleanup={disposed:world.disposed,contextLost:gl.isContextLost()};rows.push(row);}
}
document.querySelector('#run').onclick=async()=>{
 document.querySelector('#run').disabled=true;document.querySelector('#cancel').disabled=false;
 try{
  const cases=[{biome:'gran-rio',culture:'suajili',dense:true},...[['sabana','mapungubwe'],['gran-rio','suajili'],['gran-canon','musgum'],['volcanes','etiope'],['manglares','saheliana'],['desierto','mapungubwe']].map(([biome,culture])=>({biome,culture}))];
  const selected=new URLSearchParams(location.search).get('case');assert(!selected||cases.some(c=>(c.dense?'dense':c.biome)===selected),'Unknown QA case');
  for(const current of cases.filter(c=>!selected||(c.dense?'dense':c.biome)===selected)){status.textContent='Traveling '+current.biome+'/'+current.culture+(current.dense?' denso':'');await runCase(current);}
 }catch(e){errors.push(String(e));close();}
 const report={done:true,cancelled,rows,errors,scope:'Readback temporal regression: real async isolated preparation, camera movement, advancing renderer mixer poses, native shadows and paused logical state. Not a frametime benchmark, live simulation/attack campaign, mobile proof or production acceptance.'};
 document.querySelector('#report').textContent=JSON.stringify(report);document.querySelector('#cancel').disabled=true;status.textContent='Terminado, GPU liberada. '+rows.length+' casos; errores '+errors.length;
 for(const row of rows)for(const capture of row.captures){const img=new Image();img.src=capture.png;img.alt=row.biome+(row.dense?' denso':'')+' '+capture.elapsed+'ms';document.querySelector('#captures').append(img);}
};

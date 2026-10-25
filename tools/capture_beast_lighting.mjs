import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.WG_QA_URL??'http://127.0.0.1:5194',out='docs/qa/beast-lighting',records=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 const biomes=(process.env.WG_BIOMES??'sabana,gran-rio,manglares,volcanes,gran-canon,desierto').split(',');
 const speciesList=(process.env.WG_SPECIES??'warthog,hyena,lion,buffalo,rhino').split(',');
 for(const species of speciesList)for(const biome of ['warthog','hyena'].includes(species)?biomes:['gran-canon']){
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/tests/browser/beast-replacement.html?species=${species}&biome=${biome}`,{waitUntil:'commit'});
  await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});
  const ready=await page.evaluate(()=>({ready:beastQA.ready,error:beastQA.error}));assert(ready.ready,ready.error);
  for(const view of ['close','game']){
   await page.evaluate(async view=>{beastQA.state.time=350;await beastQA.setView('front',view==='game'?11:6.2,view==='game'?7:1.5);beastQA.pose('Walking',.2)},view);
   await page.evaluate(async()=>{const w=beastQA.world;await w.whenChunksReady();await w.horizon.whenReady();for(let i=0;i<12;i++){await new Promise(requestAnimationFrame);w.render(0)}window.beastLightingMeta=beastQA.capture();delete beastLightingMeta.png;});
   const captures=[];
   for(const enabled of [false,true]){
    const frame=await page.evaluate(async enabled=>{
     const q=beastQA,w=q.world,T=await import('/node_modules/three/build/three.module.js');w.toon.beastUniforms.uBeastStyle.value=enabled?1:0;w.drawWorldFrame();
     const root=w.objects.get('qa-new-beast'),box=new T.Box3().setFromObject(root,true),points=[];
     for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z).project(w.camera));
     const rect={left:Math.max(0,Math.floor(Math.min(...points.map(p=>(p.x+1)*640)))-8),right:Math.min(1280,Math.ceil(Math.max(...points.map(p=>(p.x+1)*640)))+8),top:Math.max(0,Math.floor(Math.min(...points.map(p=>(1-p.y)*450)))-8),bottom:Math.min(900,Math.ceil(Math.max(...points.map(p=>(1-p.y)*450)))+8)};
     const lights=[];w.scene.traverse(o=>{if(o.isLight)lights.push({type:o.type,color:o.color.toArray(),intensity:o.intensity,position:o.position.toArray()})});
     const globalLighting={lights,exposure:w.renderer.toneMappingExposure,night:w.toon.uniforms.uNight.value,nightLight:w.toon.uniforms.uNightLight.value};
     return {...beastLightingMeta,png:w.renderer.domElement.toDataURL('image/png').split(',')[1],glError:w.renderer.getContext().getError(),rect,globalLighting};
    },enabled);
    const png=Buffer.from(frame.png,'base64');delete frame.png;
    const file=`${species}-${biome}-${view}-${enabled?'after':'before'}.jpg`;await sharp(png).jpeg({quality:94}).toFile(`${out}/${file}`);
    const raw=await sharp(png).removeAlpha().raw().toBuffer();captures.push({frame,raw,file});
   }
   const [before,after]=captures;assert.deepEqual(after.frame.globalLighting,before.frame.globalLighting,'Global lighting changed');
   let changed=0,outside=0,beforeLuma=0,afterLuma=0;const r=after.frame.rect,outliers=[];
   for(let i=0;i<before.raw.length;i+=3){const delta=Math.max(...[0,1,2].map(k=>Math.abs(before.raw[i+k]-after.raw[i+k])));if(delta<=1)continue;
    changed++;const p=i/3,x=p%1280,y=Math.floor(p/1280);if(x<r.left||x>r.right||y<r.top||y>r.bottom){outside++;if(outliers.length<50)outliers.push({x,y,delta,before:[...before.raw.subarray(i,i+3)],after:[...after.raw.subarray(i,i+3)]})}
    beforeLuma+=before.raw[i]*.2126+before.raw[i+1]*.7152+before.raw[i+2]*.0722;afterLuma+=after.raw[i]*.2126+after.raw[i+1]*.7152+after.raw[i+2]*.0722;
   }
   // Subpixel vegetation edges can vary between GPU draws. Bound that raster
   // noise to 0.01% of the framebuffer; preserve the exact count in the report.
   if(outside)console.log(JSON.stringify({species,biome,view,outside}));
   assert(changed>30,'No visible beast lighting change');assert(outside<=Math.ceil(1280*900*.0001),'Background changed beyond raster edge tolerance');assert.equal(after.frame.glError,0);assert.deepEqual(errors,[]);
   records.push({species,biome,view,before:before.file,after:after.file,model:after.frame.model,changedPixels:changed,changedOutsideActorBounds:outside,actorBounds:r,beforeMeanChangedLuminance:beforeLuma/changed,afterMeanChangedLuminance:afterLuma/changed,globalLightingUnchanged:true,globalLighting:after.frame.globalLighting,errors});
  }
  await page.close();console.log(species,biome,'beast-only A/B verified');
  await writeFile(`${out}/comparison.json`,JSON.stringify({scope:'Same paused native WorldScene, camera, geometry, textures, time and lights; switch only the beast material uniform. Pixel comparison uses original lossless drawing buffers before JPEG encoding. Tolerance: 1 RGB level; at most 0.01% of framebuffer pixels outside actor bounds may differ at raster edges. Exact outside counts are reported, not treated as pixel-identical backgrounds.',records},null,2)+'\n');
 }
}finally{await browser.close()}

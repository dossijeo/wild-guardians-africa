import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-river/shore';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of ['gran-rio']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});


 // QA-only authoritative sample selects a fixed main-river bank; not used in coverage distribution.
 await page.evaluate(()=>{const w=window.qaCampaignWorld,z=15.827254901960785,x=w.nav.field.riverX(z)+10;window.qaCoverageOrigin=[x,w.nav.field.surface(x,z)+.4,z]});
 const result=await page.evaluate(async()=>{
 const w=window.qaCampaignWorld;w.controls.target.fromArray(window.qaCoverageOrigin);w.camera.position.copy(w.controls.target).add({x:22,y:16,z:18});w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
 const {applyMaterialStudy}=await import('/tools/experiments/qa-continuous-grass-river.js'),{hashCell}=await import('/src/world/terrain.js'),{footprintDistance}=await import('/src/world/footprints.js');await applyMaterialStudy(w,'C');w.render(.016);const q=w.qaContinuousGrass;
 const sample=(c,x,z)=>{const lx=Math.max(0,Math.min(47.99999,x-c.cx*48+24)),lz=Math.max(0,Math.min(47.99999,z-c.cz*48+24)),ix=Math.floor(lx),iz=Math.floor(lz),fx=lx-ix,fz=lz-iz,a=c.h[iz*49+ix],b=c.h[iz*49+ix+1],d=c.h[(iz+1)*49+ix],e=c.h[(iz+1)*49+ix+1];const slope=fx+fz<=1?Math.hypot(b-a,d-a):Math.hypot(e-d,e-b);const mx=lx/1.5+1,mz=lz/1.5+1,gx=Math.floor(mx),gz=Math.floor(mz),tx=mx-gx,tz=mz-gz;const ctx=[];for(let k=0;k<4;k++){const at=(xx,zz)=>c.mask.data[(zz*35+xx)*4+k]/255;ctx.push((at(gx,gz)*(1-tx)+at(gx+1,gz)*tx)*(1-tz)+(at(gx,gz+1)*(1-tx)+at(gx+1,gz+1)*tx)*tz)}return {slope,ctx};};
 let eligible=0,boxExcluded=0,dryBeyond2m=0;const examples=[],oldBoxes=new Map();for(const [key,c]of q.chunks){const boxes=[...c.water];for(const m of w.chunks.get(key).children.filter(m=>m.userData.nativeFluid==='chunk')){m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;boxes.push([b.min.x+c.cx*48,b.min.z+c.cz*48,b.max.x+c.cx*48,b.max.z+c.cz*48]);}oldBoxes.set(key,boxes);}
 for(const tile of q.tiles.values()){const c=q.chunks.get(tile.chunk),step=q.spacing;for(let ix=Math.ceil(tile.tx*8/step);ix<(tile.tx+1)*8/step-1e-6;ix++)for(let iz=Math.ceil(tile.tz*8/step);iz<(tile.tz+1)*8/step-1e-6;iz++){
 const bits=hashCell(w.nav.field.seed,ix,iz,8371),x=(ix+.5)*step+((bits&255)/255-.5)*step*.25,z=(iz+.5)*step+(((bits>>>8)&255)/255-.5)*step*.25;
 if(x<c.cx*48-24||x>=c.cx*48+24||z<c.cz*48-24||z>=c.cz*48+24)continue;const v=sample(c,x,z),[cover,meso,moisture,wear]=v.ctx;
 if(cover<.2||moisture<.2||wear>.25||v.slope>.42)continue;
 if((q.blockers.get(Math.floor(x/8)+','+Math.floor(z/8))??[]).some(o=>o.polygon?footprintDistance(o.polygon,x,z)<.6:Math.hypot(x-o.x,z-o.z)<o.r+.6))continue;
 if([[.6,0],[-.6,0],[0,.6],[0,-.6],[.42,.42],[-.42,.42],[.42,-.42],[-.42,-.42]].some(([dx,dz])=>sample(c,x+dx,z+dz).ctx[3]>.27))continue;
 eligible++;if(!oldBoxes.get(tile.chunk).some(b=>x>b[0]-.6&&x<b[2]+.6&&z>b[1]-.6&&z<b[3]+.6))continue;boxExcluded++;
 const water=w.nav.field.waterInfo(x,z);if(!water.inside&&water.shore>2){dryBeyond2m++;if(examples.length<12)examples.push({x,z,shore:water.shore,cover,moisture});}
 }}
 return {target:window.qaCoverageOrigin,eligibleBeforeWater:eligible,boxExcluded,dryBeyond2m,examples,audit:q.audit(),note:'Offline QA candidate reconstruction and waterInfo reference. Counts exclude current occupancy/wear/slope failures. No runtime queries added; asset-water visual bounds still require separate comparison.'};
 });
 await writeFile(out+'/water-box-audit.json',JSON.stringify({result,errors},null,2)+'\n');console.log(JSON.stringify({eligible:result.eligibleBeforeWater,boxExcluded:result.boxExcluded,dryBeyond2m:result.dryBeyond2m,errors}));await page.close();
 }}finally{await browser.close()}

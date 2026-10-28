import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

if(!process.env.WG_QA_PLAYWRIGHT_MODULE)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to the local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const out=process.argv[2]??'docs/qa/despertares/visual',base=process.env.WG_QA_URL??'http://127.0.0.1:5201';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[],captures=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
try{
  await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
  await page.goto(`${base}/?qa-spatial-seed=712&qa-crop-spell-frame`);
  await page.waitForSelector('#native-menu',{timeout:60000});
  const menu=page.frames().find(frame=>frame.url().includes('/menu/'));if(!menu)throw Error('Native menu missing');
  await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));
  await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')||document.querySelector('.loading-failure'),null,{timeout:180000});
  const setup=await page.evaluate(async()=>{
    const qa=globalThis.wildGuardiansSpatialQa?.();if(!qa?.world||!qa.fieldShared)throw Error('Real Wild Engine authority not ready');
    const {state:s,world:w}=qa,G=await import('/src/simulation/game.js'),{cropSpec}=await import('/src/simulation/rules.js');
    globalThis.__wildSpellFrameManual=true;s.pauses=[];s.time=120;s.tutorial.step='done';
    if(!s.structures.some(p=>p.kind==='center'))G.placeStructure(s,'qa-center',s.villages[0].center,w.nav);
    const center=s.structures[0],offsets=[[0,0],[1.5,0],[-1.5,0],[0,1.5],[0,-1.5],[1.5,1.5],[-1.5,-1.5]];let chosen;
    for(let z=-6;z<=6&&!chosen;z+=1.5)for(let x=4.5;x<=15&&!chosen;x+=1.5){
      const points=offsets.map(([dx,dz])=>({x:center.x+x+dx,z:center.z+z+dz}));
      if(points.every(p=>w.nav.placement(p.x,p.z,.4).valid))chosen=points;
    }
    if(!chosen)throw Error('No native site for the visual crop cohort');
    for(const [i,p] of chosen.entries())G.plant(s,'qa-crop-'+i,'maiz',p.x,p.z,w.nav);
    for(const p of s.plants){p.growth=cropSpec(p.species).growth_seconds;for(const water of p.water)water.status='manual';}
    s.pauses=['qa-visual'];const focus=s.plants[0],y=w.nav.field.surface(focus.x,focus.z);
    w.controls.target.set(focus.x,y+.6,focus.z);w.camera.position.set(focus.x+5,y+4.2,focus.z+7);
    w.camera.lookAt(w.controls.target);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
    w.syncChunks();await w.whenChunksReady();w.render(0);
    const gl=w.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    return {seed:s.seed,biome:s.biome,culture:s.culture,fieldShared:qa.fieldShared,
      nativeChunks:qa.nativeChunks,plants:s.plants.map(p=>({id:p.id,species:p.species,x:p.x,z:p.z})),
      renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
  });
  const style=await page.addStyleTag({content:'#hud,#narrator,#context,#notices,#panel,#toolbar,#modal,#placementBanner{visibility:hidden!important}'});
  const capture=async(name,time)=>{
    const stats=await page.evaluate(time=>{
      const {world:w,state:s}=globalThis.wildGuardiansSpatialQa();s.time=time;w.render(0);
      return {time,elapsed:s.elapsed,quality:w.quality,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),
        roots:{...w.awakeningRoots.stats,tiles:w.awakeningRoots.tiles.size},calls:w.renderer.info.render.calls,
        triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures};
    },time);
    await page.locator('canvas#world').screenshot({path:`${out}/${name}.png`});captures.push({name,...stats});
  };
  await capture('normal-day',120);
  await page.evaluate(async()=>{
    const {state:s}=globalThis.wildGuardiansSpatialQa(),{awakeningState}=await import('/src/simulation/awakenings.js'),{bless}=await import('/src/simulation/game.js');
    s.pauses=[];awakeningState(s).progress=100;bless(s,'qa-bless',s.plants[0].id);s.pauses=['qa-visual'];
    s.elapsed+=2;
  });
  await capture('one-source-day',120);await capture('one-source-night',420);
  await style.evaluate(element=>element.remove());
  if(errors.length)throw Error(JSON.stringify(errors));
  await writeFile(`${out}/captures.json`,JSON.stringify({scope:'Real app launched from its menu on Wild Engine. Prescribed QA crop layout, mature growth, fixed clock, prefilled charge and paused simulation; no generated concept images. Not campaign/balance or mobile validation.',setup,captures,errors},null,2)+'\n');
  console.log(JSON.stringify({out,captures:captures.length,errors,setup}));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({message:error.message,stack:error.stack,errors,captures},null,2)+'\n');throw error;}
finally{await browser.close();}

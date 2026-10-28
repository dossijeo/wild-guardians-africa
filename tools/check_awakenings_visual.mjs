import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

if(!process.env.WG_QA_PLAYWRIGHT_MODULE)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to the local Playwright index.mjs');
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const out=process.argv[2]??'docs/qa/despertares/visual',base=process.env.WG_QA_URL??'http://127.0.0.1:5201';
await mkdir(out,{recursive:true});
async function phase(name,pending,ms=120000){
  console.log('AWAKENING_QA '+name);let timer;
  try{return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`QA deadline in ${name}; this is a harness limit, not a native game verdict`)),ms);})]);}
  finally{clearTimeout(timer);}
}
const browser=await phase('launch',chromium.launch({channel:'chrome',headless:true,timeout:60000}));
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[],captures=[];
console.log('AWAKENING_QA page-created');
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text()+' '+JSON.stringify(message.location()));if(message.text().startsWith('AWAKENING_QA '))console.log(message.text());});
page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
try{
  // The application has no favicon. Keep that unrelated automatic browser request out of the game-asset gate.
  await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
  await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
  await phase('menu-navigation',page.goto(`${base}/?qa-spatial-seed=712&qa-crop-spell-frame`));
  await page.waitForSelector('#native-menu',{timeout:60000});
  const menu=page.frames().find(frame=>frame.url().includes('/menu/'));if(!menu)throw Error('Native menu missing');
  await phase('menu-start',menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'mapungubwe'},location.origin)));
  await phase('native-loading',page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')||document.querySelector('.loading-failure'),null,{timeout:240000}),245000);
  const setup=await phase('native-fixture',page.evaluate(async()=>{
    const qa=globalThis.wildGuardiansSpatialQa?.();if(!qa?.world||!qa.fieldShared)throw Error('Real Wild Engine authority not ready');
    const {state:s,world:w}=qa,G=await import('/src/simulation/game.js'),{cropSpec}=await import('/src/simulation/rules.js');
    globalThis.__wildSpellFrameManual=true;s.pauses=[];s.time=120;s.tutorial.step='done';
    console.log('AWAKENING_QA fixture-commands');
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
    console.log('AWAKENING_QA fixture-chunks');
    // Staged native chunk installation is driven by the application's frame scheduler.
    // Keep RAF alive while waiting; only simulation is paused in this visual fixture.
    s.initialPreparation=false;globalThis.__wildSpellFrameManual=false;w.syncChunks();await w.whenChunksReady();
    globalThis.__wildSpellFrameManual=true;
    console.log('AWAKENING_QA fixture-render');w.render(0);
    const gl=w.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
    return {seed:s.seed,biome:s.biome,culture:s.culture,fieldShared:qa.fieldShared,
      nativeChunks:qa.nativeChunks,plants:s.plants.map(p=>({id:p.id,species:p.species,x:p.x,z:p.z})),
      renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
  }));
  const style=await page.addStyleTag({content:'#hud,#narrator,#context,#notices,#panel,#toolbar,#modal,#placementBanner{visibility:hidden!important}'});
  const capture=async(name,time)=>{
    const stats=await phase(name+'-render',page.evaluate(time=>{
      const {world:w,state:s}=globalThis.wildGuardiansSpatialQa();s.time=time;w.render(0);
      return {time,elapsed:s.elapsed,quality:w.quality,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),
        roots:{...w.awakeningRoots.stats,tiles:w.awakeningRoots.tiles.size},calls:w.renderer.info.render.calls,
        triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures};
    },time));
    await phase(name+'-capture',page.locator('canvas#world').screenshot({path:`${out}/${name}.png`,timeout:45000}));captures.push({name,...stats});
  };
  await capture('normal-day',120);
  await page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),{awakeningState}=await import('/src/simulation/awakenings.js'),{bless}=await import('/src/simulation/game.js');
    s.pauses=[];awakeningState(s).progress=100;bless(s,'qa-bless',s.plants[0].id);s.pauses=['qa-visual'];
    w.render(0);s.elapsed+=.8;
  });
  await capture('awakening',120);
  await page.evaluate(()=>{globalThis.wildGuardiansSpatialQa().state.elapsed+=5;});
  await capture('one-source-day',120);await capture('one-source-night',420);
  await phase('source-damage',page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),{applyCropImpact}=await import('/src/simulation/crop-impact-health.js'),{emit}=await import('/src/simulation/game.js');
    const p=s.plants[0],hit=applyCropImpact(s,p,1);emit(s,'CropHit',{targetId:p.id,...hit});w.render(0);s.elapsed+=.2;
  }));
  await capture('source-damaged',420);
  await phase('source-destruction',page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),{applyCropImpact}=await import('/src/simulation/crop-impact-health.js'),{emit}=await import('/src/simulation/game.js');
    const p=s.plants[0],hit=applyCropImpact(s,p,1);emit(s,'CropHit',{targetId:p.id,...hit});emit(s,'CropDestroyed',{targetId:p.id});w.render(0);s.elapsed+=.3;
  }));
  await capture('source-destroying',420);
  await page.evaluate(()=>{globalThis.wildGuardiansSpatialQa().state.elapsed+=1;});await capture('source-destroyed',420);
  await phase('nearby-sources',page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),{awakeningState}=await import('/src/simulation/awakenings.js'),{bless}=await import('/src/simulation/game.js');
    s.time=120;s.pauses=[];for(const i of [1,2,3]){awakeningState(s).progress=100;bless(s,'nearby-'+i,s.plants[i].id);}
    s.pauses=['qa-visual'];w.render(0);s.elapsed+=5;
  }));
  await capture('nearby-sources-day',120);await capture('nearby-sources-night',420);
  await phase('distributed-sources',page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js'),{awakeningState}=await import('/src/simulation/awakenings.js'),{cropSpec}=await import('/src/simulation/rules.js');
    s.time=120;s.pauses=[];const anchor=s.plants[0];let groups=0;
    for(let dz=-6;dz<=6&&groups<2;dz+=3)for(let dx=6;dx<=15&&groups<2;dx+=3){
      const points=[[0,0],[1.5,0],[0,1.5]].map(([x,z])=>({x:anchor.x+dx+x,z:anchor.z+dz+z}));
      if(!points.every(p=>w.nav.placement(p.x,p.z,.4).valid&&s.plants.every(q=>!q.alive||Math.hypot(q.x-p.x,q.z-p.z)>=1.2)))continue;
      for(const [i,p] of points.entries()){G.plant(s,`distributed-${groups}-${i}`,'maiz',p.x,p.z,w.nav);const crop=s.plants.at(-1);crop.growth=cropSpec(crop.species).growth_seconds;for(const water of crop.water)water.status='manual';}
      awakeningState(s).progress=100;G.bless(s,'distributed-source-'+groups,s.plants.at(-3).id);groups++;
    }
    if(groups!==2)throw Error('Native distributed visual cohort could not be placed');
    s.pauses=['qa-visual'];w.render(0);s.elapsed+=5;
    const x=anchor.x+5,z=anchor.z,y=w.nav.field.surface(x,z);w.controls.target.set(x,y+.7,z);w.camera.position.set(x+10,y+10,z+13);
    globalThis.__wildSpellFrameManual=false;w.syncChunks();await w.whenChunksReady();globalThis.__wildSpellFrameManual=true;
  }));
  await capture('distributed-sources-day',120);await capture('distributed-sources-night',420);
  await phase('normal-wall',page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js');s.time=120;s.pauses=[];
    const anchor=s.plants[0];let wall;
    for(const [dx,dz] of [[4.5,0],[0,4.5],[-3,0],[4.5,-3],[-3,-3]]){
      try{if(G.placeStructure(s,'qa-wall',{kind:'wall',material:'adobe',x:anchor.x+dx,z:anchor.z+dz},w.nav)){wall=s.structures.at(-1);break;}}catch{}
    }
    if(!wall)throw Error('Native wall site was unavailable');globalThis.awakeningQaWall=wall.id;s.pauses=['qa-visual'];
    const y=w.nav.field.surface(wall.x,wall.z);w.controls.target.set(wall.x,y+.6,wall.z);w.camera.position.set(wall.x+4,y+3,wall.z+5);w.render(0);
  }));
  await capture('wall-normal-day',120);
  await phase('blessed-wall',page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),{awakeningState}=await import('/src/simulation/awakenings.js'),{bless}=await import('/src/simulation/game.js');
    s.pauses=[];awakeningState(s).progress=100;bless(s,'qa-wall-bless',globalThis.awakeningQaWall);s.pauses=['qa-visual'];w.render(0);s.elapsed+=5;
  }));
  await capture('wall-blessed-day',120);await capture('wall-blessed-night',420);
  await style.evaluate(element=>element.remove());
  if(errors.length)throw Error(JSON.stringify(errors));
  await writeFile(`${out}/captures.json`,JSON.stringify({scope:'Real app launched from its menu on Wild Engine. Prescribed QA crop layout, mature growth, fixed clock, prefilled charge and paused simulation; no generated concept images. Not campaign/balance or mobile validation.',setup,captures,errors},null,2)+'\n');
  console.log(JSON.stringify({out,captures:captures.length,errors,setup}));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({message:error.message,stack:error.stack,errors,captures},null,2)+'\n');throw error;}
finally{await browser.close();}

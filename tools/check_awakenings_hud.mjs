import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
if(!process.env.WG_QA_PLAYWRIGHT_MODULE)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to Playwright index.mjs');
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const out=process.argv[2]??'docs/qa/despertares/hud',base=process.env.WG_QA_URL??'http://127.0.0.1:5201';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},locale:'es-ES'}),errors=[],records=[];
page.setDefaultNavigationTimeout(120000);
page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text()+' '+JSON.stringify(message.location()));});
const receipt=()=>({scope:'Real application, Wild Engine and native HUD. Prescribed paid crop/wall layout, mature crops and QA-prefilled charges; pointer/keyboard interactions use the actual live handlers. Desktop viewport checks do not certify mobile GPU performance.',records,errors});
try{
  await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
  await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
  console.log('HUD_QA loading');await page.goto(`${base}/?qa-spatial-seed=712&qa-crop-spell-frame`);
  await page.waitForSelector('#native-menu',{timeout:60000});
  const menu=page.frames().find(f=>f.url().includes('/menu/'));if(!menu)throw Error('Native menu missing');
  await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));
  await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]'),null,{timeout:180000});
  console.log('HUD_QA fixture');await page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js'),{cropSpec}=await import('/src/simulation/rules.js'),{TUTORIAL_IDS}=await import('/src/tutorial/messages.js');
    s.pauses=[];s.time=120;s.day=6;s.completedNights=5;s.tutorial.step='done';s.tutorial.basicSkipped=true;s.tutorial.reading=null;s.tutorial.pending=[];s.tutorial.seen=[...TUTORIAL_IDS];s.initialPreparation=false;
    if(!s.structures.some(p=>p.kind==='center'))G.placeStructure(s,'hud-center',s.villages[0].center,w.nav);
    const center=s.structures[0];let site;
    for(let dz=-6;dz<=6&&!site;dz+=1.5)for(let dx=4.5;dx<=15&&!site;dx+=1.5){
      const p={x:center.x+dx,z:center.z+dz},q={x:p.x+1.5,z:p.z};
      if(w.nav.placement(p.x,p.z,.4).valid&&w.nav.placement(q.x,q.z,.4).valid)site=[p,q];
    }
    if(!site)throw Error('No real native crop sites');
    for(const [i,p] of site.entries())G.plant(s,'hud-crop-'+i,'maiz',p.x,p.z,w.nav);
    for(const p of s.plants){p.growth=cropSpec(p.species).growth_seconds;for(const water of p.water)water.status='manual';}
    for(const [dx,dz] of [[4.5,0],[0,4.5],[-3,0],[4.5,-3]]){
      try{if(G.placeStructure(s,'hud-wall',{kind:'wall',material:'adobe',x:site[0].x+dx,z:site[0].z+dz},w.nav))break;}catch{}
    }
    if(!s.structures.some(p=>p.kind==='wall'))throw Error('No real native wall site');
    w.focus({...s.plants[0],distance:14});s.awakenings.progress=78;
  });
  const charge=async value=>{
    await page.evaluate(value=>{globalThis.wildGuardiansSpatialQa().state.awakenings.progress=value;},value);
    await page.waitForFunction(value=>Number(document.querySelector('#awakeningHud [role="progressbar"]').getAttribute('aria-valuenow'))===value,value);
    await page.waitForTimeout(900);
  };
  const shot=async name=>{
    const boxes=await page.evaluate(()=>{
      const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),stage=document.querySelector('#stage');
      return {viewport:{w:innerWidth,h:innerHeight},portrait:stage.classList.contains('portrait'),reserve:parseFloat(stage.style.getPropertyValue('--reserve')),
        awakening:rect('#awakeningHud'),clock:rect('#clock'),money:rect('#money'),days:rect('#days'),menu:rect('#menuButton'),actions:rect('#actions'),
        progress:s.awakenings.progress,total:s.awakenings.total,selecting:!!w.awakeningSelecting,
        disabled:document.querySelector('#awakeningButton').disabled,caption:document.querySelector('#awakeningButton').getAttribute('aria-label')};
    });
    const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
    assert.ok(boxes.awakening.bottom<=boxes.viewport.h-boxes.reserve+1,`tutorial reserve overlap in ${name}`);
    assert.ok(!overlap(boxes.awakening,boxes.actions),`actions overlap in ${name}`);
    for(const key of ['clock','money','days','menu'])assert.ok(!overlap(boxes.awakening,boxes[key]),`${key} overlap in ${name}`);
    await page.screenshot({path:`${out}/${name}.png`});records.push({name,...boxes});console.log('HUD_QA '+name);
  };
  const selecting=async value=>page.waitForFunction(value=>!!globalThis.wildGuardiansSpatialQa().world.awakeningSelecting===value,value);
  const project=async kind=>page.evaluate(kind=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),p=kind==='wall'?s.structures.find(p=>p.kind==='wall'):s.plants.find(p=>p.alive&&!p.blessing);
    const v=w.controls.target.clone().set(p.x,w.nav.field.surface(p.x,p.z)+(kind==='wall'?.65:w.cropBatch.sample(p.species,p.growth).height*.5),p.z).project(w.camera),r=w.canvas.getBoundingClientRect();
    return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,id:p.id};
  },kind);
  await charge(78);assert.equal(await page.locator('#awakeningButton').isDisabled(),true);await shot('landscape-recharging');
  await charge(100);assert.equal(await page.locator('#awakeningButton').isDisabled(),false);await shot('landscape-ready');
  await page.locator('#awakeningButton').click();await selecting(true);
  const invalid=await page.evaluate(()=>{
    const {world:w,state:s}=globalThis.wildGuardiansSpatialQa();
    for(const [x,y] of [[350,500],[600,600],[400,450],[700,450]]){const hit=w.pick({clientX:x,clientY:y});if(!s.plants.some(p=>p.id===hit.entityId)&&!s.structures.some(p=>p.id===hit.entityId&&p.kind==='wall'))return {x,y};}
    throw Error('No visible invalid target');
  });
  await page.mouse.click(invalid.x,invalid.y);await page.waitForFunction(()=>document.querySelector('#placementBanner .command-feedback')?.textContent.includes('Elige una planta viva'));
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  await page.locator('[data-placement-cancel]').click();await selecting(false);
  await page.locator('#awakeningButton').click();await selecting(true);
  const plant=await project('plant');await page.mouse.click(plant.x,plant.y);
  await page.waitForSelector('[data-placement-confirm]:enabled');assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  await shot('landscape-selection');
  const before=await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().world.controls.target.toArray());
  await page.mouse.move(580,480);await page.mouse.down();await page.mouse.move(650,500,{steps:15});await page.mouse.up();
  await page.waitForFunction(before=>globalThis.wildGuardiansSpatialQa().world.controls.target.distanceTo({x:before[0],y:before[1],z:before[2]})>.01,before);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  await page.locator('[data-placement-confirm]').click();await selecting(false);
  await page.waitForFunction(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.total===1);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),0);
  await charge(100);await page.keyboard.press('5');await selecting(true);await page.keyboard.press('Escape');await selecting(false);
  await page.locator('#awakeningButton').click();await selecting(true);
  const wall=await project('wall');await page.mouse.click(wall.x,wall.y);await page.waitForSelector('[data-placement-confirm]:enabled');
  await page.locator('[data-placement-confirm]').click();await selecting(false);
  await page.waitForFunction(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.total===2);
  await page.setViewportSize({width:1280,height:592});await charge(78);await shot('landscape-blessed-matched');
  for(const [name,width,height] of [['portrait',390,844],['compact-landscape',844,390],['small-portrait',360,640]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>{const {state:s,world:w}=globalThis.wildGuardiansSpatialQa();w.focus({...s.plants[0],distance:14});});
    await charge(78);await shot(name+'-recharging');await charge(100);await shot(name+'-ready');
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#awakeningButton').click();await selecting(true);await shot('portrait-selection');
  await page.locator('[data-placement-cancel]').click();await selecting(false);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  if(errors.length)throw Error(JSON.stringify(errors));
  await writeFile(`${out}/hud.json`,JSON.stringify(receipt(),null,2)+'\n');console.log(JSON.stringify({captures:records.length,errors}));
}catch(error){await writeFile(`${out}/failure.json`,JSON.stringify({...receipt(),message:error.message,stack:error.stack},null,2)+'\n');throw error;}
finally{await browser.close();}

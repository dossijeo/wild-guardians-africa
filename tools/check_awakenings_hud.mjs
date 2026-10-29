import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
if(!process.env.WG_QA_PLAYWRIGHT_MODULE)throw Error('Set WG_QA_PLAYWRIGHT_MODULE to Playwright index.mjs');
const {chromium}=await import(pathToFileURL(process.env.WG_QA_PLAYWRIGHT_MODULE).href);
const out=process.argv[2]??'docs/qa/despertares/hud',base=process.env.WG_QA_URL??'http://127.0.0.1:5201';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},locale:'es-ES',hasTouch:true}),errors=[],records=[];
page.setDefaultNavigationTimeout(120000);
page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text()+' '+JSON.stringify(message.location()));});
const receipt=()=>({scope:'Real application, Wild Engine and native HUD. Prescribed paid crop/wall layout, mature crops, tutorial/notification fixtures and QA-prefilled charges. Mouse, keyboard, touch and drag use live handlers; touch and safe insets are emulated in desktop Chrome. No physical mobile device or mobile GPU was tested.',records,errors});
try{
  await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
  await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
  console.log('HUD_QA loading');await page.goto(`${base}/?qa-spatial-seed=712&qa-crop-spell-frame`);
  await page.waitForSelector('#native-menu',{timeout:60000});
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>{try{return f.contentWindow.location.pathname.includes('/menu/');}catch{return false;}}),null,{timeout:60000});
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
    let wallCount=0;
    for(const [dx,dz] of [[4.5,0],[0,4.5],[-3,0],[4.5,-3],[-3,4.5],[6,4.5]]){
      try{if(G.placeStructure(s,`hud-wall-${dx}-${dz}`,{kind:'wall',material:'adobe',x:site[0].x+dx,z:site[0].z+dz},w.nav)&&++wallCount===2)break;}catch{}
    }
    if(wallCount<2)throw Error('Two real native wall sites are required');
    w.focus({...s.plants[0],distance:14});s.awakenings.progress=78;
  });
  const charge=async value=>{
    await page.evaluate(value=>{globalThis.wildGuardiansSpatialQa().state.awakenings.progress=value;},value);
    await page.waitForFunction(value=>Number(document.querySelector('#awakeningHud [role="progressbar"]').getAttribute('aria-valuenow'))===value,value);
    await page.waitForTimeout(900);
  };
  if(process.argv.includes('--baseline')){
    for(const [width,height] of [[320,568],[360,640],[390,844],[768,1024],[568,320],[844,390],[1280,592],[1280,720]]){
      await page.setViewportSize({width,height});
      for(const value of [78,100]){
        await charge(value);
        const geometry=await page.evaluate(()=>{
          const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
          return {awakening:box(document.querySelector('#awakeningButton')),actions:[...document.querySelector('#actions').children].map(box),
            tutorial:document.querySelector('#guardian-root .bubble')?box(document.querySelector('#guardian-root .bubble')):null};
        });
        const name=`${width}x${height}-${value}`;await page.screenshot({path:`${out}/${name}.png`});records.push({name,geometry});console.log('HUD_BASELINE '+name);
      }
    }
    if(errors.length)throw Error(JSON.stringify(errors));
    await writeFile(`${out}/hud.json`,JSON.stringify(receipt(),null,2)+'\n');
  }else{
  const shot=async name=>{
    const boxes=await page.evaluate(()=>{
      const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),stage=document.querySelector('#stage');
      const guardian=document.querySelector('#guardian-root'),bubble=guardian?.querySelector('.bubble'),banner=document.querySelector('#placementBanner');
      const visual=[...stage.querySelectorAll('#awakeningHud .awakening-ring,#awakeningHud .awakening-short-caption')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};});
      return {viewport:{w:innerWidth,h:innerHeight},portrait:stage.classList.contains('portrait'),reserve:parseFloat(stage.style.getPropertyValue('--reserve')),
        awakening:rect('#awakeningHud'),clock:rect('#clock'),money:rect('#money'),days:rect('#days'),menu:rect('#menuButton'),actions:rect('#actions'),
        tutorial:bubble&&guardian.getAttribute('aria-hidden')==='false'&&getComputedStyle(bubble).visibility==='visible'?rect('#guardian-root .bubble'):null,
        banner:banner&&getComputedStyle(banner).display!=='none'?rect('#placementBanner'):null,
        visual,safeBottom:parseFloat(getComputedStyle(stage.querySelector('.awakening-safe-probe')).paddingBottom)||0,
        actionButtons:[...stage.querySelectorAll('#actions button')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};}),
        actionLabels:[...stage.querySelectorAll('#actions .action-label')].map(e=>{const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect();return {text:e.textContent,left:r.left,right:r.right};}),
        closeButtons:[...stage.querySelectorAll('#notices [data-dismiss-notice],#guardian-root[aria-hidden="false"] .tutorial-close,#placementBanner:not([hidden]) button')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,cssWidth:parseFloat(s.width),cssHeight:parseFloat(s.height)};}),
        noticeCards:[...stage.querySelectorAll('#notices .notice-card')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}),
        progress:s.awakenings.progress,total:s.awakenings.total,selecting:!!w.awakeningSelecting,
        disabled:document.querySelector('#awakeningButton').disabled,caption:document.querySelector('#awakeningButton').getAttribute('aria-label')};
    });
    await page.screenshot({path:`${out}/${name}.png`});records.push({name,...boxes});console.log('HUD_QA '+name);
    const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
    assert.ok(boxes.awakening.bottom<=boxes.viewport.h+1,`viewport overflow in ${name}`);
    assert.ok(!overlap(boxes.awakening,boxes.actions),`actions overlap in ${name}`);
    if(boxes.tutorial)assert.ok(!overlap(boxes.awakening,boxes.tutorial),`tutorial overlaps awakening in ${name}`);
    if(boxes.tutorial)assert.ok(!overlap(boxes.actions,boxes.tutorial),`tutorial overlaps original actions in ${name}`);
    for(const element of boxes.visual){assert.ok(!overlap(element,boxes.actions),`medallion ornament overlaps actions in ${name}`);if(boxes.tutorial)assert.ok(!overlap(element,boxes.tutorial),`medallion ornament overlaps tutorial in ${name}`);assert.ok(element.bottom<=boxes.viewport.h-boxes.safeBottom+1,`medallion ornament crosses safe area in ${name}`);}
    for(const button of boxes.actionButtons)assert.ok(button.width>=44&&button.height>=44,`action touch target too small in ${name}`);
    for(const label of boxes.actionLabels)assert.ok(label.left>=-1&&label.right<=boxes.viewport.w+1,`action label clipped in ${name}: ${JSON.stringify(label)}`);
    for(const button of boxes.closeButtons)assert.ok(button.cssWidth>=44&&button.cssHeight>=44&&button.width>=43.5&&button.height>=43.5,`close or confirmation touch target too small in ${name}`);
    for(const card of boxes.noticeCards){assert.ok(!overlap(card,boxes.awakening),`notice overlaps awakening in ${name}`);if(boxes.tutorial)assert.ok(!overlap(card,boxes.tutorial),`notice overlaps tutorial in ${name}`);}
    if(boxes.banner&&boxes.tutorial)assert.ok(!overlap(boxes.banner,boxes.tutorial),`selection overlaps tutorial in ${name}`);
    for(const key of ['clock','money','days','menu'])assert.ok(!overlap(boxes.awakening,boxes[key]),`${key} overlap in ${name}`);
  };
  const selecting=async value=>page.waitForFunction(value=>!!globalThis.wildGuardiansSpatialQa().world.awakeningSelecting===value,value);
  const project=async kind=>page.evaluate(kind=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),p=kind==='wall'?s.structures.find(p=>p.kind==='wall'&&!p.blessing):s.plants.find(p=>p.alive&&!p.blessing);
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
  const tap=async locator=>{
    const element=await locator.elementHandle();assert.ok(element,'touch target exists');
    await page.waitForFunction(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&(hit===el||el.contains(hit));},element);
    const box=await locator.boundingBox();assert.ok(box,'touch target is visible');await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  };
  // Use touch emulation against the actual world picker and confirmation handlers.
  await page.setViewportSize({width:320,height:568});await tap(page.locator('#awakeningButton'));await selecting(true);
  const portraitPlant=await project('plant');await page.touchscreen.tap(portraitPlant.x,portraitPlant.y);
  await page.waitForSelector('[data-placement-confirm]:enabled');
  // Open a real, nonblocking tutorial message deterministically for this overlap case.
  await page.evaluate(()=>{const t=globalThis.wildGuardiansSpatialQa().state.tutorial;t.reading='mechanic.defenses';t.seen=t.seen.filter(id=>id!=='mechanic.defenses');});
  await page.waitForFunction(()=>document.querySelector('#guardian-root[aria-hidden="false"] .message')?.textContent.includes('No confundas silencio'));
  await page.waitForFunction(()=>{const e=document.querySelector('#guardian-root .bubble'),s=getComputedStyle(e);return Number(s.opacity)>.99&&(s.transform==='none'||new DOMMatrix(s.transform).a>.999);});
  const bubble=page.locator('#guardian-root .bubble');
  if(await bubble.evaluate(e=>e.scrollHeight>e.clientHeight+1)){
    await bubble.hover();await page.mouse.wheel(0,120);await page.waitForFunction(()=>document.querySelector('#guardian-root .bubble').scrollTop>0);
    await bubble.evaluate(e=>{e.scrollTop=0;});
  }
  assert.match(await page.locator('#placementBanner').innerText(),/20\s*%/);await shot('portrait-small-plant-confirmation');
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  const beforeTouch=await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().world.camera.position.toArray());
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:45,y:300}]});
  for(const x of [55,65,75,85,95,105,115])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:300}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(before=>globalThis.wildGuardiansSpatialQa().world.camera.position.distanceTo({x:before[0],y:before[1],z:before[2]})>.01,beforeTouch);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().world.awakeningTargetId),portraitPlant.id,'camera gesture keeps the selected target');
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  await cdp.detach();
  await tap(page.locator('[data-placement-cancel]'));await selecting(false);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100,'touch cancellation preserves the charge');
  // The existing notification queue keeps its readable lifetime while the guardian is open.
  await page.evaluate(async()=>{const {state:s}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js');s.messages=[];G.notice(s,'La tierra está preparada: tienes un Despertar disponible.',null,{category:'awakening-ready'});});
  assert.equal(await page.locator('#guardian-root .tutorial-close').isVisible(),true,'tutorial fixture must be open');
  await page.waitForTimeout(300);assert.equal(await page.locator('#notices .notice-card').count(),0,'notice waits behind the tutorial');
  await shot('portrait-tutorial-ready-notice-queued');
  await page.evaluate(async()=>{const {state:s}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js');G.notice(s,'Una fuente mágica está bajo ataque. ¡Protégela!',null,{category:'awakening-threat'});});
  await page.waitForFunction(()=>document.querySelector('#notices .notice-card strong')?.textContent==='Magia bajo amenaza');
  await shot('portrait-tutorial-urgent-notification');await tap(page.locator('#notices .notice-card .dismiss').first());
  await page.evaluate(async()=>{const {state:s}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js');G.notice(s,'Una fuente mágica ha sido destruida. Sus cultivos pierden la influencia.',null,{category:'awakening-lost'});});
  await page.waitForFunction(()=>document.querySelector('#notices .notice-card strong')?.textContent==='Bendición perdida');
  await shot('portrait-tutorial-lost-notification');await tap(page.locator('#notices .notice-card .dismiss').first());
  await tap(page.locator('#guardian-root .tutorial-close'));
  await page.waitForSelector('#notices .notice-card',{timeout:45000});await shot('portrait-ready-notification');
  await tap(page.locator('#notices .notice-card .dismiss').first());
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),wall=s.structures.find(p=>p.kind==='wall'&&!p.blessing);w.focus({...wall,distance:12});});
  await page.waitForTimeout(800);await tap(page.locator('#awakeningButton'));await selecting(true);
  const portraitWall=await project('wall');await page.touchscreen.tap(portraitWall.x,portraitWall.y);
  await page.waitForSelector('[data-placement-confirm]:enabled');await page.waitForTimeout(500);
  assert.match(await page.locator('#placementBanner').innerText(),/25\s*%/);await shot('portrait-wall-confirmation');
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  await tap(page.locator('[data-placement-confirm]'));await selecting(false);
  await page.waitForFunction(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.total===3);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),0);
  await page.waitForFunction(()=>document.querySelector('#awakeningButton').disabled&&document.querySelector('#placementBanner').hidden);
  const applied=await page.evaluate(id=>{const {state:s}=globalThis.wildGuardiansSpatialQa();return {blessed:!!s.structures.find(p=>p.id===id)?.blessing,notified:s.messages.some(m=>m.category==='awakening-applied'&&m.target===id)};},portraitWall.id);
  assert.deepEqual(applied,{blessed:true,notified:true});await shot('portrait-after-bless');
  for(const [width,height] of [[320,568],[360,640],[390,844],[768,1024],[568,320],[844,390],[1280,592],[1280,720]]){
    await page.setViewportSize({width,height});
    for(const value of [78,100]){await charge(value);await shot(`final-${width}x${height}-${value}`);}
  }
  // Orientation changes keep the same live simulation and banked charge.
  for(const value of [78,100]){
    await page.setViewportSize({width:360,height:640});await charge(value);
    await page.setViewportSize({width:640,height:360});await page.waitForFunction(()=>!document.querySelector('#stage').classList.contains('portrait'));
    assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),value);
    await page.setViewportSize({width:360,height:640});await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('portrait'));
    assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),value);
    await shot(`portrait-rotated-${value}`);
  }
  for(const [width,height] of [[320,568],[360,640]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{document.querySelector('#stage').style.setProperty('--awakening-extra-safe-bottom','34px');window.dispatchEvent(new Event('resize'));});
    await page.waitForFunction(()=>document.querySelector('#awakeningButton').getBoundingClientRect().bottom<=innerHeight-34);
    const fit=await page.evaluate(()=>[...document.querySelectorAll('#awakeningHud .awakening-value,#awakeningHud .awakening-short-caption')].map(e=>({name:e.className,scroll:e.scrollWidth,client:e.clientWidth,text:e.textContent})));
    assert.ok(fit.every(e=>e.scroll<=e.client+1),`safe-area medallion text overflow: ${JSON.stringify(fit)}`);await shot(`portrait-safe-inset-${width}`);
    await page.evaluate(()=>{document.querySelector('#stage').style.removeProperty('--awakening-extra-safe-bottom');window.dispatchEvent(new Event('resize'));});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#awakeningButton').evaluate(e=>getComputedStyle(e).animationName),'none');
  await shot('portrait-reduced-motion-ready');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.WildGuardiansLanguage.setLanguage('en'));
  await page.waitForFunction(()=>document.querySelector('#awakeningButton').getAttribute('aria-label').includes('Awakening ready'));
  await page.waitForTimeout(500);assert.match(await page.locator('#awakeningButton').getAttribute('aria-label'),/Awakening ready/);
  await shot('portrait-english-ready');
  await page.evaluate(()=>{const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),plant=s.plants.find(p=>p.alive&&!p.blessing);w.focus({...plant,distance:14});});
  await page.waitForTimeout(800);await tap(page.locator('#awakeningButton'));await selecting(true);await shot('portrait-english-selection');
  const englishPlant=await project('plant');await page.touchscreen.tap(englishPlant.x,englishPlant.y);
  await page.waitForSelector('[data-placement-confirm]:enabled');
  await page.waitForFunction(()=>document.querySelector('#placementBanner').textContent.includes('Nearby crops'));
  await page.waitForTimeout(500);assert.match(await page.locator('#placementBanner').innerText(),/20\s*%/);await shot('portrait-english-plant-confirmation');
  await tap(page.locator('[data-placement-cancel]'));await selecting(false);
  for(const [width,height] of [[320,568],[360,640],[390,844],[768,1024],[568,320],[844,390],[1280,592],[1280,720]]){
    await page.setViewportSize({width,height});
    for(const value of [78,100]){await charge(value);assert.match(await page.locator('#awakeningButton').getAttribute('aria-label'),/Awakening/);await shot(`english-${width}x${height}-${value}`);}
  }
  await page.evaluate(()=>window.WildGuardiansLanguage.setLanguage('es'));
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.WildGuardiansLanguage.setLanguage('en'));
  await charge(78);await shot('landscape-english-recharging');await charge(100);await shot('landscape-english-ready');
  await page.evaluate(()=>window.WildGuardiansLanguage.setLanguage('es'));
  await page.setViewportSize({width:390,height:844});
  await tap(page.locator('#menuButton'));await page.waitForSelector('#modal [role="dialog"]');
  await page.waitForFunction(()=>document.querySelector('#awakeningButton').disabled);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  await page.screenshot({path:`${out}/portrait-pause-menu.png`});await tap(page.locator('#resume'));
  await page.waitForFunction(()=>!document.querySelector('#awakeningButton').disabled);
  await page.evaluate(async()=>{const {state:s}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js');G.pause(s,'hiring');});
  await page.waitForSelector('#hiring-dialog');await page.waitForFunction(()=>document.querySelector('#awakeningButton').disabled);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  await page.screenshot({path:`${out}/portrait-hiring.png`});
  await tap(page.locator('[data-crew-step="0"][data-delta="1"]'));await page.waitForSelector('#hireConfirm:enabled');await tap(page.locator('#hireConfirm'));
  await page.waitForFunction(()=>!document.querySelector('#awakeningButton').disabled);
  assert.equal(await page.evaluate(()=>globalThis.wildGuardiansSpatialQa().state.awakenings.progress),100);
  for(const [category,message,title] of [
    ['awakening-day','Despertar +4.0 · Agricultura 2, economía 2.','La tierra despierta'],
    ['awakening-applied','La planta ha despertado: es una fuente permanente de fertilidad.','Bendición permanente'],
    ['awakening-threat','Una fuente mágica está bajo ataque. ¡Protégela!','Magia bajo amenaza'],
    ['awakening-lost','Una fuente mágica ha sido destruida. Sus cultivos pierden la influencia.','Bendición perdida']
  ]){
    await page.evaluate(async ({category,message})=>{const {state:s}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js');s.messages=[];G.notice(s,message,null,{category});},{category,message});
    await page.waitForFunction(title=>document.querySelector('#notices .notice-card strong')?.textContent===title,title);
    await shot(`portrait-notification-${category}`);await tap(page.locator('#notices .notice-card .dismiss').first());
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  await writeFile(`${out}/hud.json`,JSON.stringify(receipt(),null,2)+'\n');console.log(JSON.stringify({captures:records.length,errors}));
  }
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({...receipt(),message:error.message,stack:error.stack},null,2)+'\n');throw error;}
finally{await browser.close();}

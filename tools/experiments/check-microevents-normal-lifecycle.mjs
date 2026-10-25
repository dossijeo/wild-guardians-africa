import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='docs/qa/production-integration-20261025/microevents-normal';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],report={scope:'Normal menu/new game on Vite, no QA URL, no forced spawn or world mutation. Observer wraps controller tick without changing arguments or return.'};page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://localhost:5190/');
 await page.evaluate(async()=>{const {Microevents}=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/src/microevents/controller.js'))?.name??'/src/microevents/controller.js');const tick=Microevents.prototype.tick;Microevents.prototype.tick=function(...args){window.__observedMicroevents=this;return tick.apply(this,args);};});
 const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});if(process.env.WG_MICROEVENT_SAVE){const fixture=JSON.parse(await readFile(process.env.WG_MICROEVENT_SAVE,'utf8'));await page.evaluate(f=>localStorage.setItem('wild-guardians:slot:'+f.slotId,f.snapshot),fixture);report.fixture=fixture.scope;await menu.getByRole('button',{name:'Continuar',exact:true}).click();await menu.locator('[data-production-save="'+fixture.slotId+'"]').click();}else{await menu.getByRole('button',{name:'Juego nuevo',exact:true}).click();await menu.locator('#panelstage:not([inert])').waitFor({state:'visible',timeout:60000});
 const selector=menu.frameLocator('iframe.production-section');await selector.locator('[data-biome="sabana"]').click();await selector.locator('#confirmButton').click();await selector.locator('[data-culture="mapungubwe"]').click();await selector.locator('#confirmButton').click();}await page.waitForSelector('#stage[aria-busy="true"]',{timeout:60000});await page.waitForSelector('#stage[aria-busy="false"]',{timeout:180000});
 await page.evaluate(async()=>{const {Microevents}=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/src/microevents/controller.js'))?.name??'/src/microevents/controller.js');const tick=Microevents.prototype.tick;Microevents.prototype.tick=function(...args){window.__observedMicroevents=this;return tick.apply(this,args);};});
 const skip=page.getByRole('button',{name:'Omitir tutorial básico',exact:true});if(await skip.isVisible())await skip.click();
 report.samples=[];let seen=false;
 for(let i=0;i<90;i++){
  if(await skip.isVisible())await skip.click();
  const s=await page.evaluate(()=>{const c=window.__observedMicroevents;return c?{active:c.active?.def.id,blocked:c.blocked(),anchors:c.anchors.length,records:c.records.filter(r=>r.type!=='opportunity'),instances:c.billboards.count,disposed:c.disposed}:null;});report.samples.push(s);console.log(JSON.stringify(s?{i,active:s.active,blocked:s.blocked,anchors:s.anchors}:{i}));
  if(s&&!s.blocked.length&&!s.anchors&&!report.planted){await page.locator('[data-menu="grow"]').click();await page.locator('[data-crop]:not([disabled])').first().click();for(const [x,y] of [[450,500],[650,500],[800,550]])await page.mouse.click(x,y);await page.keyboard.press('Escape');report.planted=true;}
  if(s?.active){seen=true;report.spawn=s;await page.screenshot({path:out+'/spawn.png'});await page.locator('#menuButton').click();await page.locator('#exit').click();await page.waitForSelector('#native-menu',{timeout:60000});report.exit=await page.evaluate(()=>{const c=window.__observedMicroevents;return {disposed:c.disposed,active:c.active?.def.id??null,pending:c.pending,attached:!!c.billboards.root.parent};});break;}
  await page.waitForTimeout(2000);
 }
 report.seen=seen;if(!seen){await page.screenshot({path:out+'/no-spawn.png'});report.body=(await page.locator('body').innerText()).slice(-2500);process.exitCode=1;}
}catch(e){report.error=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}finally{await writeFile(out+'/report.json',JSON.stringify({...report,errors},null,2));await browser.close();}

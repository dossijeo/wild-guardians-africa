import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.argv[2]??'docs/qa/production-integration-20261025/menu-validation';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
try{for(const [name,width,height] of [['wide',1280,720],['portrait',390,844],['ultrawide',1920,810]]){
 const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width:1280,height:720}}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push({message:m.text(),location:m.location()});});
 page.on('response',r=>{if(r.status()>=400)errors.push({status:r.status(),url:r.url()});});
 await page.goto(process.env.WG_MENU_URL??'http://localhost:5190/menu/index.html');await page.locator('#loading').waitFor({state:'hidden',timeout:60000});
 await page.mouse.move(width*.15,height*.5);await page.waitForTimeout(700);await page.screenshot({path:out+'/'+name+'-home.png'});
 await page.mouse.move(width*.85,height*.5);await page.waitForTimeout(700);await page.screenshot({path:out+'/'+name+'-parallax.png'});
 await page.getByRole('button',{name:'Opciones',exact:true}).click();await page.locator('#panelstage:not([inert])').waitFor({state:'visible',timeout:30000});await page.screenshot({path:out+'/'+name+'-options.png'});
 await page.keyboard.press('Escape');await page.locator('#hotspots:not([inert])').waitFor({state:'visible',timeout:30000});await page.waitForTimeout(500);await page.screenshot({path:out+'/'+name+'-returned.png'});
 const controls=await page.locator('#hotspots button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,visible:r.width>0&&r.height>0,onScreen:r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight};}));
 const video=page.video();await context.close();await video.saveAs(out+'/'+name+'-journey.webm');reports.push({name,width,height,errors,controls});
}}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(reports,null,2));}console.log(JSON.stringify(reports));

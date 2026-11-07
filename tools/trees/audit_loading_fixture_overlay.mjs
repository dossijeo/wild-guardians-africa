import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try { for(const name of ['interactive-loading-run','interactive-loading-resource-run','interactive-loading-first-crops']) {
 const page=await browser.newPage({viewport:{width:800,height:600}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/src/rendering/loading-cinematic.js*',async route=>{const response=await route.fetch();let s=await response.text();if(!s.includes('this.onSky();')||!s.includes('this.onHandoff();'))throw Error('cinematic hook missing');s=s.replace('this.onSky();',"window.__skyBefore=!!document.querySelector('#loading-cancel');this.onSky();window.__skyAfter=!!document.querySelector('#loading-cancel');").replace('this.onHandoff();',"window.__handoff=!!document.querySelector('#loading-cancel');this.onHandoff();");await route.fulfill({response,body:s});});
 await page.goto(`http://127.0.0.1:5175/tests/browser/${name}.html?biome=sabana&culture=mapungubwe&quality=media&presentation&mute`);await page.locator('#run').click();try{await page.waitForSelector('#loading-cancel',{state:'visible',timeout:90000});}catch(e){console.log(name,await page.locator('#status').textContent(),JSON.stringify(errors));throw e;}await page.waitForFunction(()=>window.__handoff!==undefined,null,{timeout:240000});const values=await page.evaluate(()=>({before:window.__skyBefore,after:window.__skyAfter,handoff:window.__handoff}));if(!values.before||values.after||values.handoff||errors.length)throw Error(JSON.stringify({name,values,errors}));console.log(JSON.stringify({name,...values}));await page.close();
 } } finally {await browser.close();}




import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.WG_WATER_OUT??'docs/qa/post-beasts-20261026/water-before';
const seed=Number(process.env.WG_WATER_SEED??37);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 if(process.env.WG_NETWORK_VARIANT==='8')await page.route('**/src/app/wild-engine-world.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('state.mangroveChannels=true','state.mangroveNetwork=true')});});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('this.raycaster=new','globalThis.qaWaterWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',music:0,sfx:0})));
 await page.goto('http://127.0.0.1:5218/?qa-seed='+seed);
 const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'manglares',culture:'mapungubwe'},location.origin));
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&globalThis.qaWaterWorld?.state,null,{timeout:240000});
 await page.waitForTimeout(3000);
 // Presentation-only diagnostic: do not advance tutorial steps or let its
 // guided placement camera override the requested comparison views.
 await page.addStyleTag({content:'#guardian-root{display:none!important}'});
 await page.evaluate(()=>{qaWaterWorld.cinematic=true;});
 await page.screenshot({path:out+'/world.png'});
 const data=await page.evaluate(async()=>{
  const w=qaWaterWorld,f=w.nav.field,points=[];const o=w.controls.target;
  for(let z=-60;z<=60;z+=2)for(let x=-60;x<=60;x+=2){const px=o.x+x,pz=o.z+z;points.push({x:px,z:pz,h:f.surface(px,pz),water:f.waterInfo(px,pz)});}
  const waters=[];w.scene.traverse(m=>{if(m.userData.nativeFluid)waters.push({kind:m.userData.nativeFluid,vertices:m.geometry?.attributes.position.count,bounds:m.geometry?.boundingBox});});
  return {seed:w.state.seed,channels:w.state.mangroveChannels===true,target:o.toArray(),camera:w.camera.position.toArray(),points,waters,fieldKeys:Object.keys(f),snapshot:JSON.stringify(w.state)};
 });
 await writeFile(out+'/report.json',JSON.stringify({data,errors},null,2));
 await page.evaluate(()=>{const w=qaWaterWorld,t=w.controls.target;w.camera.position.set(t.x+75,t.y+95,t.z+95);w.camera.lookAt(t);w.camera.updateMatrixWorld(true);});
 await page.waitForTimeout(2000);await page.screenshot({path:out+'/elevated.png'});
 console.log(JSON.stringify({seed:data.seed,target:data.target,wet:data.points.filter(p=>p.water.inside).length,total:data.points.length,waters:data.waters.length,errors}));
}finally{await browser.close();}

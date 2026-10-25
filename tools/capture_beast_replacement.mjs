import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import sharp from 'sharp';
const {chromium}=createRequire(import.meta.url)('playwright');
const species=process.argv[2]??'hyena',base=process.env.WG_QA_URL??'http://127.0.0.1:5194',out=process.env.WG_BEAST_QA_OUT??`docs/qa/${species}-replacement`,records=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
try{
 for(const biome of process.env.WG_SKIP_VISUAL==='1'?[]:(process.env.WG_BIOMES??'sabana,gran-rio,manglares,volcanes,gran-canon,desierto').split(',')){
  const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.goto(`${base}/tests/browser/beast-replacement.html?species=${species}&biome=${biome}`,{waitUntil:'commit',timeout:90000});
  await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});
  const initial=await page.evaluate(()=>({ready:beastQA.ready,error:beastQA.error}));if(!initial.ready)throw Error(JSON.stringify(initial));
  for(const [view,clip,phase] of [['front','Walking',.2],['back','Walking',.2],['front','Running',.3],['front','Charged_Upward_Slash',.5],['front','Right_Hand_Sword_Slash',.5],['front','Weapon_Combo',.5],['front','Weapon_Combo_2',.5]]){
   await page.evaluate(async({view,clip,phase})=>{await beastQA.setView(view);beastQA.pose(clip,phase)},{view,clip,phase});
   const info=await page.evaluate(()=>beastQA.capture());const filename=`${biome}-${view}-${clip}.jpg`;
   await sharp(Buffer.from(info.png,'base64')).jpeg({quality:92}).toFile(`${out}/${filename}`);delete info.png;
   if(info.glError||info.errors.length||errors.length)throw Error(JSON.stringify({info,errors}));
   records.push({...info,file:filename,phase,view});
  }
  // Nearby daytime view catches material clipping that night lighting could hide.
  await page.evaluate(async()=>{beastQA.state.time=150;await beastQA.setView();beastQA.pose('Walking',.2)});
  const day=await page.evaluate(()=>beastQA.capture());await sharp(Buffer.from(day.png,'base64')).jpeg({quality:92}).toFile(`${out}/${biome}-day.jpg`);delete day.png;records.push({...day,file:`${biome}-day.jpg`});
  if(biome==='sabana')for(const view of ['front','back']){
   await page.evaluate(async({view,species})=>{await beastQA.setView(view,species==='rhino'?5.5:4.5,species==='rhino'?1.7:1.2);beastQA.pose('Walking',.2)},{view,species});
   const detail=await page.evaluate(()=>beastQA.capture()),file=`${biome}-detail-${view}-day.jpg`;
   await sharp(Buffer.from(detail.png,'base64')).jpeg({quality:95}).toFile(`${out}/${file}`);delete detail.png;records.push({...detail,file,view});
  }
  await page.close();console.log(biome,'captured');
  await writeFile(`${out}/captures.json`,JSON.stringify({scope:'Native WorldScene and production animal controller; paused deterministic QA raid in actual biome geometry, seed 712. No performance benchmark.',resolution:[1280,900],encoding:'JPEG quality 92 from native drawing buffer PNG',records},null,2)+'\n');
 }
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});
 const raidUrl=`${base}/tests/browser/animal-preload.html?biome=gran-canon&motion=1&attack-species=${species}&copies=1&approved=1`;
 await page.goto(raidUrl,{waitUntil:'commit',timeout:90000});
 await page.waitForFunction(()=>{try{return JSON.parse(document.querySelector('#report').textContent).ok!==undefined}catch{return false}},null,{timeout:240000});
 const raid=JSON.parse(await page.locator('#report').innerText());
 raid.replacementModel=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species].url;raid.qaUrl=raidUrl;
 await writeFile(`${out}/native-raid.json`,JSON.stringify(raid,null,2)+'\n');
 if(!raid.ok)throw Error('Native raid failed: '+JSON.stringify(raid));
 await page.locator('#inspect').click();await page.locator('#report').evaluate(e=>e.style.display='none');
 await page.screenshot({path:`${out}/native-raid.jpg`,type:'jpeg',quality:92});
 console.log('Native movement, attack and first hit verified');await page.close();
}finally{await browser.close();}

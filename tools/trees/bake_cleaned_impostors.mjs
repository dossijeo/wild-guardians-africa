import fs from 'node:fs';import {createRequire} from 'node:module';import sharp from 'sharp';
import {downsamplePrelitLinear} from '../experiments/downsample-prelit-linear.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const out='docs/lighting/tree-near-retexture/impostors';fs.mkdirSync(out,{recursive:true});
try{
 for(const [biome,slot]of [['savanna',1],['grand_river',1],['grand_river',3]])for(const phase of ['day','night']){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:5175/tests/browser/far-vegetation-atlas.html?biome=${biome}&slot=${slot}&lod=0&bake=${phase}&native-sun=1&approved-lighting=1&rotations=8&resolution=256&elevation=8`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#bake').disabled,null,{timeout:60000});
  await page.locator('#bake').click();await page.locator('#download').waitFor({state:'visible',timeout:60000});
  const result=await page.evaluate(()=>({metadata:JSON.parse(document.querySelector('#report').textContent),png:document.querySelector('#download').href.split(',')[1]}));
  if(errors.length||result.metadata.errors.length||result.metadata.webglError)throw Error(JSON.stringify({errors,metadata:result.metadata}));
  const png=Buffer.from(result.png,'base64'),decoded=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const filtered=downsamplePrelitLinear(decoded.data,decoded.info.width,decoded.info.height,2);
  const stem=`${out}/${biome}-${slot}-${phase}`;
  await sharp(filtered.data,{raw:{width:filtered.width,height:filtered.height,channels:4}}).png().toFile(`${stem}.png`);
  fs.writeFileSync(`${stem}.json`,JSON.stringify({source:result.metadata,output:{width:filtered.width,height:filtered.height,viewResolution:128,encoding:filtered.encoding,supersampling:2},errors},null,2)+'\n');
  console.log(stem);await page.close();
 }
}finally{await browser.close();}

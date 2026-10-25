/** Rasterize native sprite models; --only preserves every unrelated RGBA byte. */
import {chromium} from 'playwright';
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {SPRITE_SLOTS} from '../assets-source/microevents/lowpoly-models.js';
const only=process.argv[2],slot=SPRITE_SLOTS.find(([id])=>id===only);
if(only&&!slot)throw Error('Unknown sprite: '+only);
const path='assets-source/microevents/lowpoly-atlas.png',original=only?await sharp(await readFile(path)).ensureAlpha().raw().toBuffer():null;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 const url=new URL('/tools/microevent-sprite-authoring.html',process.env.WG_QA_URL??'http://localhost:5190');if(only)url.searchParams.set('only',only);
 await page.goto(url.href);await page.locator('#render').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Ready:'),null,{timeout:60000});
 const data=Buffer.from((await page.locator('#download').getAttribute('href')).split(',')[1],'base64');
 if(!only)await writeFile(path,data);
 else{
  const rendered=await sharp(data).ensureAlpha().raw().toBuffer();
  for(let i=slot[1];i<slot[1]+slot[2];i++)for(let y=0;y<64;y++){
   const offset=((Math.floor(i/8)*64+y)*512+i%8*64)*4;rendered.copy(original,offset,offset,offset+64*4);
  }
  await writeFile(path,await sharp(original,{raw:{width:512,height:512,channels:4}}).png().toBuffer());
 }
}finally{await browser.close();}
console.log('Rendered '+(only??'all sprites')+'. Run node tools/generate_microevent_assets.mjs to publish the atlas.');

import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5175/');const directory=process.env.CAPTURE_DIR??'eyelid-shadow-blink-close';
 const result=await page.evaluate(async directory=>{
  const load=async name=>{const im=new Image();im.src=`/docs/guardian/gpu-animation/${directory}/${name}.png`;await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return {width:c.width,height:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};};
  const diff=(a,b)=>{if(a.width!==b.width||a.height!==b.height)throw Error('Image size mismatch');let changed=0,max=0,sum=0;for(let i=0;i<a.data.length;i+=4){let p=0;for(let j=0;j<3;j++){const d=Math.abs(a.data[i+j]-b.data[i+j]);p=Math.max(p,d);sum+=d;}if(p)changed++;max=Math.max(max,p);}return {changed,max,mean:sum/(a.width*a.height*3)};};
  const names=['openOriginal','openSkipped','halfOriginal','halfSkipped','closedOriginal','closedSkipped','noShadows'],[a,b,c,d,e,f,g]=await Promise.all(names.map(load));const repeat=directory.startsWith('eyelid-shadow-animal-')?await Promise.all(['openRepeat','halfRepeat','closedRepeat'].map(load)):null;return {width:a.width,height:a.height,open:diff(a,b),half:diff(c,d),closed:diff(e,f),repeat:repeat?[diff(a,repeat[0]),diff(c,repeat[1]),diff(e,repeat[2])]:null,blinkControl:diff(a,e),shadowControl:diff(f,g)};
 },directory);
 if(result.blinkControl.changed<20||result.shadowControl.changed<100)throw Error('Blink or shadow control failed '+JSON.stringify(result));
 await writeFile(`docs/guardian/gpu-animation/${directory}/comparison.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}

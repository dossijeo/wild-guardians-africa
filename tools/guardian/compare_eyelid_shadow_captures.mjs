import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5175/');const directory=process.env.CAPTURE_DIR??'eyelid-shadow-qa-abba';
 const rows=await page.evaluate(async directory=>{
  const image=async path=>{const im=new Image();im.src=path;await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return {width:c.width,height:c.height,pixels:ctx.getImageData(0,0,c.width,c.height).data};};
  const diff=(a,b)=>{if(a.width!==b.width||a.height!==b.height)throw Error('Image size mismatch');let changed=0,max=0,sum=0;for(let i=0;i<a.pixels.length;i+=4){let p=0;for(let j=0;j<3;j++){const d=Math.abs(a.pixels[i+j]-b.pixels[i+j]);sum+=d;p=Math.max(p,d);}if(p)changed++;max=Math.max(max,p);}return {changed,max,mean:sum/(a.width*a.height*3)};};
  const rows=[];for(let i=0;i<4;i++){const base=`/docs/guardian/gpu-animation/${directory}/${i}-`,[a,b,c]=await Promise.all(['original','repeat','skipped'].map(name=>image(base+name+'.png')));const negative={...a,pixels:new Uint8ClampedArray(a.pixels)};for(let j=0;j<negative.pixels.length;j+=4)negative.pixels[j]=255-negative.pixels[j];rows.push({index:i,width:a.width,height:a.height,repeat:diff(a,b),skipped:diff(a,c),negative:diff(a,negative)});}return rows;
 },directory);
 if(rows.length!==4||rows.some(r=>r.negative.changed<100))throw Error('Visual negative control failed');
 const report={scope:'Synchronous captures after each benchmark block, original/repeat/eyelid-shadow omission from the same current scene. Repeated originals must match before the skipped comparison can be interpreted. Negative control inverts the red channel. Not a perceptual or temporal gameplay validation.',rows};
 await writeFile(`docs/guardian/gpu-animation/${directory}/visual-comparison.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows));
}finally{await browser.close();}

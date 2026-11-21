import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5175/');const directory=process.env.CAPTURE_DIR??'eyelid-shadow-frozen-repeat';
 const result=await page.evaluate(async directory=>{
  const load=async name=>{const img=new Image();img.src=`/docs/guardian/gpu-animation/${directory}/${name}.png`;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {w:c.width,h:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};};
  const compare=(a,b)=>{if(a.w!==b.w||a.h!==b.h)throw Error('Size mismatch');let changed=0,max=0,sum=0;for(let i=0;i<a.data.length;i+=4){let m=0;for(let j=0;j<3;j++){const d=Math.abs(a.data[i+j]-b.data[i+j]);m=Math.max(m,d);sum+=d;}if(m)changed++;max=Math.max(max,m);}return {changed,max,mean:sum/(a.w*a.h*3)};};
  const [a,b,c,d,e]=await Promise.all(['original','originalRepeat','skipped','skippedRepeat','negative'].map(load));return {width:a.w,height:a.h,originalRepeat:compare(a,b),skippedRepeat:compare(c,d),originalVsSkipped:compare(a,c),shadowNegative:compare(c,e)};
 },directory);
 if(result.shadowNegative.changed<100)throw Error('Disabling all sun shadows did not change the image');
 await writeFile(`docs/guardian/gpu-animation/${directory}/visual-comparison.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}

import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const root='docs/guardian/gpu-animation',names=['a','b','a-hidden','b-hidden'],images={};
for(const name of names)images[name]=(await readFile(`${root}/shared-isolate-${name}.png`)).toString('base64');
const points=JSON.parse(await readFile(`${root}/shared-fixed-pixel-diff.json`,'utf8')).result.stableModeDifference.map(({x,y})=>({x,y}));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),result=await page.evaluate(async({images,points})=>{
  const decoded={};for(const [name,data] of Object.entries(images)){const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);decoded[name]=ctx.getImageData(0,0,img.width,img.height);}
  const delta=(a,b,x,y)=>{const i=(y*decoded[a].width+x)*4;return Math.max(...Array.from({length:4},(_,j)=>Math.abs(decoded[a].data[i+j]-decoded[b].data[i+j])));};
  return points.map(({x,y})=>({x,y,normal:delta('a','b',x,y),nativeHidden:delta('a-hidden','b-hidden',x,y)}));
 },{images,points});await writeFile(`${root}/shared-fixed-isolation.json`,JSON.stringify({scope:'Two independent fixed-camera sessions. Compare only 14 previously stable cross-mode pixels with native merged color root visible and hidden. Hidden geometry changes the scene; matching pixels do not prove which draw or resource caused a difference.',points:result},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}

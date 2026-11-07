import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const root='docs/guardian/gpu-animation',prefix=process.env.QA_COMPARE_PREFIX??'canonical-lod',names=['a1','a2','b1','b2'],images={};
for(const name of names)images[name]=(await readFile(`${root}/${prefix}-${name}.png`)).toString('base64');
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const result=await page.evaluate(async images=>{
  const data={};for(const [name,base64] of Object.entries(images)){const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const context=canvas.getContext('2d');context.drawImage(img,0,0);data[name]=context.getImageData(0,0,img.width,img.height);}
  function compare(a,b){const x=data[a],y=data[b],tiles=new Map();let minX=x.width,minY=x.height,maxX=-1,maxY=-1,count=0;for(let py=0;py<x.height;py++)for(let px=0;px<x.width;px++){const i=(py*x.width+px)*4;let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(x.data[i+c]-y.data[i+c]));if(delta<=3)continue;count++;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);const key=`${Math.floor(px/32)*32},${Math.floor(py/32)*32}`;let t=tiles.get(key);if(!t){t={key,count:0,max:0,example:{x:px,y:py,a:Array.from(x.data.slice(i,i+4)),b:Array.from(y.data.slice(i,i+4))}};tiles.set(key,t);}t.count++;t.max=Math.max(t.max,delta);}return {a,b,count,bounds:count?{minX,minY,maxX,maxY}:null,tiles:[...tiles.values()].sort((a,b)=>b.count-a.count)};}
  return [compare('a1','a2'),compare('b1','b2'),compare('a1','b1'),compare('a2','b1'),compare('a1','b2'),compare('a2','b2')];
 },images);await writeFile(`${root}/${prefix}-diff-tiles.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.map(({a,b,count,bounds,tiles})=>({a,b,count,bounds,tiles:tiles.slice(0,5)}))));
}finally{await browser.close();}

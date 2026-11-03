import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const root='docs/guardian/gpu-animation',names=['a','a-repeat','b','b-repeat'],images={};
for(const name of names)images[name]=(await readFile(`${root}/shared-fixed-${name}.png`)).toString('base64');
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const result=await page.evaluate(async images=>{
  const decoded={};for(const [name,data] of Object.entries(images)){const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const context=canvas.getContext('2d');context.drawImage(img,0,0);decoded[name]={width:img.width,height:img.height,data:context.getImageData(0,0,img.width,img.height).data};}
  const diff=(a,b)=>{a=decoded[a];b=decoded[b];if(a.width!==b.width||a.height!==b.height)throw Error('Image dimensions differ');let changed=0,over3=0,max=0,minX=a.width,minY=a.height,maxX=-1,maxY=-1;const tiles={};for(let i=0;i<a.data.length;i+=4){let d=0;for(let j=0;j<4;j++)d=Math.max(d,Math.abs(a.data[i+j]-b.data[i+j]));if(d)changed++;if(d>3){over3++;const pixel=i/4,x=pixel%a.width,y=Math.floor(pixel/a.width),key=Math.floor(x/128)+':'+Math.floor(y/120);tiles[key]=(tiles[key]??0)+1;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}max=Math.max(max,d);}return {width:a.width,height:a.height,changed,over3,max,bounds:over3?[minX,minY,maxX,maxY]:null,tiles};};
  return {originalRepeat:diff('a','a-repeat'),sharedRepeat:diff('b','b-repeat'),between:diff('a','b')};
 },images);await writeFile(`${root}/shared-fixed-pixel-diff.json`,JSON.stringify({scope:'Two independently loaded paused island-mangrove sessions after the same real-time camera route and settled preparation. Clock fixed only for capture. Repeat controls estimate same-session noise. Identical camera does not guarantee identical full visual or GPU state; no motion, context loss or performance claim.',result},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}

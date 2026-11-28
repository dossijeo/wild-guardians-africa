import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const root='docs/guardian/gpu-animation',prefix=process.env.QA_COMPARE_PREFIX??'canonical',names=['a1','a1-repeat','a2','a2-repeat','b1','b1-repeat','b2','b2-repeat'],images={};
for(const name of names)images[name]=(await readFile(`${root}/${prefix}-${name}.png`)).toString('base64');
const points=JSON.parse(await readFile(`${root}/shared-fixed-pixel-diff.json`,'utf8')).result.stableModeDifference.map(({x,y})=>({x,y}));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),result=await page.evaluate(async({images,points})=>{
  const decoded={};for(const [name,data] of Object.entries(images)){const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);decoded[name]=ctx.getImageData(0,0,img.width,img.height);}
  const diff=(a,b)=>{a=decoded[a];b=decoded[b];if(a.width!==b.width||a.height!==b.height)throw Error('Image sizes differ');let changed=0,over3=0,max=0;for(let i=0;i<a.data.length;i+=4){let d=0;for(let j=0;j<4;j++)d=Math.max(d,Math.abs(a.data[i+j]-b.data[i+j]));if(d)changed++;if(d>3)over3++;max=Math.max(max,d);}return {width:a.width,height:a.height,changed,over3,max};};
  return {originalRepeat:diff('a1','a1-repeat'),original2Repeat:diff('a2','a2-repeat'),sharedRepeat:diff('b1','b1-repeat'),shared2Repeat:diff('b2','b2-repeat'),between:diff('a1','b1'),originalSessions:diff('a1','a2'),sharedSessions:diff('b1','b2'),crossA2B:diff('a2','b1'),crossAB2:diff('a1','b2'),crossA2B2:diff('a2','b2'),points:points.map(({x,y})=>{const i=(y*decoded.a1.width+x)*4;return {x,y,...Object.fromEntries(['a1','a2','b1','b2'].map(n=>[n,Array.from(decoded[n].data.slice(i,i+4))]))};})};
 },{images,points});await writeFile(`${root}/${prefix}-preparation-diff.json`,JSON.stringify({scope:'Four independently loaded paused island-mangrove sessions. Camera pose and clock fixed identically for capture, after far preparation settled. Does not prove continuous visual parity or identical complete world state.',result},null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}

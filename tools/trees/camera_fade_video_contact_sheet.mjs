import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

// Visual inspection only: recorded camera paths are not frame-synchronized.
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 for(const name of ['base','fade01']){
  const bytes=(await readFile(`docs/guardian/gpu-animation/camera-video-${name}.webm`)).toString('base64');
  const result=await page.evaluate(async bytes=>{
   const video=document.createElement('video');video.src='data:video/webm;base64,'+bytes;
   await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('Video metadata failed'));});
   const times=Array.from({length:8},(_,i)=>1.3+i*.1),canvas=document.createElement('canvas');canvas.width=1280;canvas.height=1440;const ctx=canvas.getContext('2d');
   for(const [i,time] of times.entries()){
    video.currentTime=time;await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=()=>reject(Error('Video seek failed'));});
    const x=i%2*640,y=Math.floor(i/2)*360;ctx.drawImage(video,x,y,640,360);ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(x,y,90,26);ctx.fillStyle='white';ctx.font='20px sans-serif';ctx.fillText(time.toFixed(1)+' s',x+5,y+20);
   }
   return {width:video.videoWidth,height:video.videoHeight,times,png:canvas.toDataURL('image/png')};
  },bytes);
  if(result.width!==1280||result.height!==720)throw Error('Unexpected video size');
  await writeFile(`docs/guardian/gpu-animation/camera-contact-${name}.png`,Buffer.from(result.png.split(',')[1],'base64'));
  console.log(JSON.stringify({name,width:result.width,height:result.height,times:result.times}));
 }
}finally{await browser.close();}

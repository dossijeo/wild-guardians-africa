import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5175/');
 const rows=[];await mkdir('.cache/contact-bank-review',{recursive:true});
 for(const species of ['buffalo','hyena','lion','rhino','warthog']){
  const result=await page.evaluate(async species=>{
   const video=document.createElement('video');video.muted=true;video.src=`/docs/guardian/gpu-animation/contact-bank-${species}-comparison.webm`;
   await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('Video load failed'));});
   const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=600;const ctx=canvas.getContext('2d'),frames=[];let count=0,lastMediaTime=-1,nonmonotonic=0;
   let callback;callback=(_now,meta)=>{count++;if(meta.mediaTime<=lastMediaTime)nonmonotonic++;lastMediaTime=meta.mediaTime;if((count===1||count===30||count===60||count===85)){ctx.drawImage(video,0,0);frames.push({frame:count,time:meta.mediaTime,data:canvas.toDataURL('image/png')});}if(!video.ended)video.requestVideoFrameCallback(callback);};
   video.requestVideoFrameCallback(callback);
   await Promise.race([new Promise((resolve,reject)=>{video.onended=resolve;video.onerror=()=>reject(Error('Video playback failed'));video.play().catch(reject);}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Playback timeout')),30000))]);
   return {width:video.videoWidth,height:video.videoHeight,callbacks:count,lastMediaTime,nonmonotonic,frames};
  },species);
  if(result.width!==1600||result.height!==600||result.callbacks<2||result.nonmonotonic)throw Error('Invalid playback '+species);
  for(const frame of result.frames){await writeFile(`.cache/contact-bank-review/${species}-${frame.frame}.png`,Buffer.from(frame.data.split(',')[1],'base64'));delete frame.data;}
  rows.push({species,...result});console.log(JSON.stringify({species,callbacks:result.callbacks,lastMediaTime:result.lastMediaTime,nonmonotonic:result.nonmonotonic}));
 }
 const report={scope:'Browser playback observation; requestVideoFrameCallback counts callbacks delivered during playback, not an authoritative count of encoded frames. Screenshots sampled at callbacks 1, 30, 60 and 85 when available. Playback timing and dropped callbacks depend on host and browser load; not a performance benchmark.',rows};
 await writeFile('docs/guardian/gpu-animation/contact-bank-playback-review.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();}

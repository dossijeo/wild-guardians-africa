import {GUARDIAN_SPRITE,guardianPose} from '/src/ui/guardian-native.js';
import {assetUrl} from '/src/rendering/asset-url.js';
import {renderGuardianProbe} from './guardian-worker-probe-render.js';
export async function probeGuardianWorker(){
 const url=assetUrl(GUARDIAN_SPRITE),image=new Image();image.src=url;await image.decode();
 const poses=['greeting','reveal','warning'].map((gesture,i)=>({time:2+i,pose:{...guardianPose(gesture,2,7,2+i,1),blend:1,angles:[.03,-.02,.05,-.01],offsets:[.002,0,-.003,0]}}));
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:300px;height:300px;';document.body.append(host);
 const canvases=[document.createElement('canvas'),document.createElement('canvas')];for(const c of canvases){c.style.width='300px';c.style.height='300px';host.append(c);}
 const worker=new Worker(new URL('./guardian-worker-probe-worker.js',import.meta.url),{type:'module'});
 let timer,heartbeat;
 try{
  const reference=renderGuardianProbe(canvases[0],canvases[1],image,poses);
  let ticks=0,maxGapMs=0,last=performance.now();heartbeat=setInterval(()=>{const now=performance.now();maxGapMs=Math.max(maxGapMs,now-last);last=now;ticks++;},10);
  const candidate=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Guardian worker probe timeout')),30000);worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data);worker.onerror=e=>reject(Error(e.message));worker.postMessage({url,width:300,height:300,dpr:devicePixelRatio,poses});});
  clearInterval(heartbeat);clearTimeout(timer);
  const difference=(a,b)=>{if(a.length!==b.length)throw Error('Guardian buffer shape mismatch');let changed=0,max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;max=Math.max(max,d);sum+=d;}return {elements:a.length,changed,max,mean:sum/a.length};};
  const premultiply=a=>Float32Array.from(a,(v,i)=>i%4===3?v:v*a[i-i%4+3]/255);
  return {scope:'Private diagnostic: unchanged native GuardianMesh/GuardianMagic on main DOM canvases vs Worker OffscreenCanvas. Static deterministic poses, exact mesh/color/magic comparisons. Context timing is wall time; heartbeat proves responsiveness only during probe, not initial loading or GPU improvement. No production renderer replacement or compatibility fallback tested.',referenceSetupMs:reference.setupMs,workerSetupMs:candidate.setupMs,workerElapsedMs:candidate.elapsedMs,contexts:candidate.contexts,heartbeat:{ticks,maxGapMs},poses:reference.results.map((r,i)=>({mesh:difference(r.positions,candidate.results[i].positions),pixels:difference(r.pixels,candidate.results[i].pixels),magic:difference(r.magic,candidate.results[i].magic),magicPremultiplied:difference(premultiply(r.magic),premultiply(candidate.results[i].magic))}))};
 }finally{clearTimeout(timer);clearInterval(heartbeat);worker.terminate();host.remove();}
}

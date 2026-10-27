import {performance} from 'node:perf_hooks';
import {MAX_SPRITES,packVfxSprites} from '../../src/rendering/vfx-native.js';

const iterations=3000, sprites=Array.from({length:120},(_,i)=>({
  p:[i%12,(i%5)*.1,Math.floor(i/12)],size:[.2,.3],angle:i*.02,
  tex:'spark',frame:0,col:[1,.8,.4],alpha:.7,dir:[0,1,0]
}));
const rects={spark:[[0,0,.1,.1]]},camera={eye:[0,4,15],forward:[0,-.1,-1]};
const reuseBuffer=new Float32Array(MAX_SPRITES*25);
function run(reuse){
  const start=performance.now();let checksum=0;
  for(let i=0;i<iterations;i++){
    const result=packVfxSprites(sprites,rects,camera,reuse?reuseBuffer:null);
    checksum+=result.count+result.data[i%25];
  }
  return {ms:performance.now()-start,checksum};
}
for(let i=0;i<2;i++){run(false);run(true);}
const lots=[false,true,true,false].map(reuse=>({mode:reuse?'reuse':'allocate',...run(reuse)}));
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return (sorted[0]+sorted[1])/2;};
const allocatedBytesAvoided=iterations*MAX_SPRITES*25*Float32Array.BYTES_PER_ELEMENT;
console.log(JSON.stringify({iterations,spritesPerEffect:sprites.length,lots,
  medianMs:{allocate:median(lots.filter(x=>x.mode==='allocate').map(x=>x.ms)),reuse:median(lots.filter(x=>x.mode==='reuse').map(x=>x.ms))},
  allocatedBytesAvoidedPerReuseLot:allocatedBytesAvoided},null,2));

export async function verifyFixedMask(w){
 const c=w.qaFixedGround;if(!c)throw Error('Fixed cache missing');
 const target=w.controls.target;
 const [key,s]=[...c.states].sort((a,b)=>Math.hypot(a[1].rect.x+24-target.x,a[1].rect.y+24-target.z)-Math.hypot(b[1].rect.x+24-target.x,b[1].rect.y+24-target.z))[0];
 const mask=s.mask,original=mask.image.data,changed=new Uint8Array(original),captures=[];
 const read=()=>{const result=new Uint8Array(514*514*4);w.renderer.readRenderTargetPixels(c.queue.entries.get(key).target,0,0,514,514,result);return result;};
 const capture=name=>{w.render(0);captures.push({name,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});};
 const settle=async()=>{for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);if(c.queue.entries.get(key)?.spec.version===s.revision)return;}throw Error('Mask rebake timeout');};
 const notify=()=>{mask.needsUpdate=true;mask.dispatchEvent({type:'groundmaskchanged'});};
 const before=read(),published=c.queue.stats.published;capture('before');
 let middle,after;
 try{
  for(let i=0;i<changed.length;i+=4){changed[i]=0;changed[i+1]=0;changed[i+3]=255;}
  mask.image.data=changed;notify();await settle();middle=read();capture('changed');
 }finally{mask.image.data=original;notify();await settle();after=read();capture('restored');}
 let different=0,restoration=0;for(let i=0;i<before.length;i++){if(before[i]!==middle[i])different++;if(before[i]!==after[i])restoration++;}
 if(!different||restoration||c.queue.stats.published!==published+2)throw Error('Mask bake change/restoration mismatch');
 return {key,changedChannels:different,restoredDifferentChannels:restoration,publications:c.queue.stats.published-published,queue:{...c.queue.stats},captures,scope:'Synthetic mask byte edit and restoration; no simulation modification'};
}

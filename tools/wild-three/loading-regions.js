import * as THREE from 'three';
// Initial loading only. The existing world-readiness barrier owns publication.
// No GL handles, private records, pixel conversion, or second scheduler.
export function createTexturePilot(renderer,assets,{scheduler,signal,check}){
 const selected=new Set(),models=['5ac817bcc','b396fba7','7de8ad720'];
 for(const [url,gltf]of assets.modelSources)if(models.some(hash=>url.includes(hash)))gltf.scene.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))for(const slot of ['map','normalMap','roughnessMap'])if(m[slot])selected.add(m[slot]);});
 const stats={completed:0,fallbacks:0,units:0,maxUnitMs:0,workMs:0,extraPixelBytes:0,records:[]};let closed=false;
 const alive=()=>{check();if(closed)throw Error('Region preparation closed');};
 async function upload(texture){
  if(!selected.has(texture)||!scheduler||!(texture.image instanceof ImageBitmap)||texture.format!==THREE.RGBAFormat||texture.type!==THREE.UnsignedByteType)return false;
  alive();const source=new THREE.Texture(texture.image),{width,height}=texture.image,record={name:texture.name,width,height,began:performance.now(),units:[]};stats.records.push(record);
  let phase='allocation',rowCost=.25,finished=false,started=false;const region=new THREE.Box2(),position=new THREE.Vector2();
  const unit=fn=>{alive();const began=performance.now();try{fn();}finally{const ms=performance.now()-began;record.units.push({phase,ms});stats.units++;stats.workMs+=ms;stats.maxUnitMs=Math.max(stats.maxUnitMs,ms);if(phase==='rows')rowCost=Math.max(ms,rowCost*.9);}};
  try{
   await scheduler.submit((function*(){
    unit(()=>{started=true;const ready=texture.source.dataReady;texture.source.dataReady=false;try{renderer.initTexture(texture);}finally{texture.source.dataReady=ready;}});phase='rows';yield;
    for(let y=0;y<height;y+=64){const last=y+64>=height;unit(()=>{region.min.set(0,y);region.max.set(width,Math.min(height,y+64));position.set(0,y);renderer.copyTextureToTexture(source,texture,region,position,0,0,{generateMipmaps:last});});if(!last)yield;}
    finished=true;
   })(),{signal,valid:()=>{alive();return true;},priority:30,deadline:performance.now()+250,estimate:()=>phase==='allocation'?1:rowCost,label:'wild-three-initial-regions'});
   if(!finished)throw Error('Region preparation cancelled');stats.completed++;return true;
  }catch(error){check();stats.fallbacks++;if(started)texture.needsUpdate=true;return false;}
  finally{record.elapsedMs=performance.now()-record.began;record.finished=finished;source.dispose();}
 }
 return {upload,stats,dispose(){closed=true;}};
}

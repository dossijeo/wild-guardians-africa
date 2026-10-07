// Experimental math shared by the isolated atlas/3D prototype, not gameplay.
const TAU=Math.PI*2;
export function treeDensityRank(id,seed=0){
 let hash=(2166136261^seed)>>>0;
 for(const character of String(id))hash=Math.imul(hash^character.codePointAt(0),16777619)>>>0;
 hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash^=hash>>>16;
 return (hash>>>0)/4294967296;
}
// Static importance weighting: preserve large silhouettes without adding shader work.
export function treeImportanceRank(rank,height,{referenceHeight=16,maximumBoost=4}={}){
 if(!Number.isFinite(rank)||rank<0||rank>=1||!Number.isFinite(height)||height<0||!Number.isFinite(referenceHeight)||referenceHeight<=0||!Number.isFinite(maximumBoost)||maximumBoost<1)throw Error('Invalid tree importance parameters');
 return rank/Math.max(1,Math.min(maximumBoost,height/referenceHeight));
}
export function farDensityFade(distance,rank,{start=100,end=240,minimum=.15,band=.04}={}){
 if(!(end>start)||minimum<0||minimum>1||!(band>0)||rank<0||rank>=1)throw Error('Invalid far density parameters');
 const t=Math.max(0,Math.min(1,(distance-start)/(end-start))),density=1-(1-minimum)*t*t*(3-2*t);
 return Math.max(0,Math.min(1,(density+band-rank)/band));
}
export function atlasViews(camera,base,yaw,views=8){
 const relative=Math.atan2(camera.x-base.x,camera.z-base.z)-yaw,sx=base.sx??base.scale??1,sz=base.sz??base.scale??1;
 // Inverse-transform the horizontal viewing direction; anisotropic scales change its local angle.
 const angle=((Math.atan2(Math.sin(relative)*sz,Math.cos(relative)*sx))%TAU+TAU)%TAU,index=angle/TAU*views,first=Math.floor(index)%views;
 return {first,second:(first+1)%views,blend:index-Math.floor(index),nearest:Math.round(index)%views};
}
export function lodMix(distance,start,end,ready=1){
 if(!(end>start))throw new Error('Transition end must exceed start');
 const t=Math.max(0,Math.min(1,(distance-start)/(end-start)));
 return 1-Math.max(0,Math.min(1,ready))*(1-t*t*(3-2*t));
}
export function modelOrigin(base,localBase,yaw,scale){
 const c=Math.cos(yaw),s=Math.sin(yaw),sx=base.sx??scale,sy=base.sy??scale,sz=base.sz??scale;
 return {x:base.x-localBase[0]*sx*c-localBase[2]*sz*s,y:base.y-localBase[1]*sy,z:base.z+localBase[0]*sx*s-localBase[2]*sz*c};
}
export function billboardRight(camera,base){
 const dx=camera.x-base.x,dz=camera.z-base.z,length=Math.hypot(dx,dz);
 return length?{x:dz/length,y:0,z:-dx/length}:{x:1,y:0,z:0};
}

// Fixed populations use an explicit revision when tree positions change.
export class NearTreeSelection {
 constructor(trees){this.trees=trees;this.indices=[];this.scans=0;this.inputs=null;}
 update(x,z,end,available,revision=0){
  const previous=this.inputs;
  if(previous&&previous.x===x&&previous.z===z&&previous.end===end&&previous.available===available&&previous.revision===revision)return false;
  this.inputs={x,z,end,available,revision};this.scans++;
  const oldLength=this.indices.length;let count=0,changed=!!previous&&previous.revision!==revision;
  if(available)for(let i=0;i<this.trees.length;i++){const t=this.trees[i];if(Math.hypot(t.x-x,t.z-z)>=end)continue;if(this.indices[count]!==i)changed=true;this.indices[count++]=i;}
  if(count!==oldLength)changed=true;this.indices.length=count;return changed;
 }
}

// Request centres move on a coarse grid, with spatial hysteresis and a short
// settling interval. Sampling/generation is never performed by this tracker.
export class FarRegionTracker{
 constructor({step=96,hysteresis=16,settleMs=150,x=0,z=0}={}){
  if(![step,hysteresis,settleMs,x,z].every(Number.isFinite)||step<=0||hysteresis<0||hysteresis>=step/2||settleMs<0)throw Error('Invalid far region tracking settings');
  this.step=step;this.hysteresis=hysteresis;this.settleMs=settleMs;this.center={x,z};this.candidate=null;
 }
 reset(x,z){if(![x,z].every(Number.isFinite))throw Error('Invalid far region centre');this.center={x,z};this.candidate=null;}
 update(x,z,now){
  if(![x,z,now].every(Number.isFinite))return null;
  const extent=this.step/2+this.hysteresis;
  if(Math.abs(x-this.center.x)<=extent&&Math.abs(z-this.center.z)<=extent){this.candidate=null;return null;}
  const nx=Math.round(x/this.step)*this.step,nz=Math.round(z/this.step)*this.step,key=nx+':'+nz;
  if(this.candidate?.key!==key)this.candidate={key,x:nx,z:nz,since:now};
  if(now-this.candidate.since<this.settleMs)return null;
  const next=this.candidate;this.center={x:next.x,z:next.z};this.candidate=null;return {key:next.key,...this.center};
 }
}
export function farRegionRequest(config,profile,{x,z},{treeHalf=180,groundHalf=240,step=4}={}){
 if(![x,z,treeHalf,groundHalf,step].every(Number.isFinite)||treeHalf<=0||groundHalf<treeHalf||step<=0)throw Error('Invalid far region request');
 return {config,profile,treeBounds:{minX:x-treeHalf,maxX:x+treeHalf,minZ:z-treeHalf,maxZ:z+treeHalf},groundBounds:{minX:x-groundHalf,maxX:x+groundHalf,minZ:z-groundHalf,maxZ:z+groundHalf},step};
}


// One descriptor shared by early loading and the eventual regional owner.
// The early path must match every field before adopting transferred arrays.
export function nativeFarRegionRequest(config,profile,center,{treeHalf=400,groundStep=8,groundColorStep=null,groundWash=.25,groundPalette=null,groundTreeBases=null,metadata,slot=0,includeGround=true,bakedOnly=false}={}){
 return {...farRegionRequest(config,profile,center,{treeHalf,groundHalf:treeHalf+32,step:groundStep}),waterSurface:bakedOnly,colorMapStep:groundColorStep,groundWash,groundPalette,treeBase:metadata.localBase,treeBases:groundTreeBases,slots:includeGround&&groundTreeBases?Object.keys(groundTreeBases).map(Number):[slot]};
}

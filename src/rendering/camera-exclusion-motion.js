// CPU-only experimental controller. Visual distances remain subject to model
// acceptance; this controller has no scene traversal or simulation effects.
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
export class CameraExclusionMotion {
 constructor(index,{radius=.45,softZone=2,rate=16,skin=1e-4}={}){
  if([radius,softZone,rate,skin].some(x=>!Number.isFinite(x)||x<=0))throw Error('Invalid camera exclusion motion');
  Object.assign(this,{index,radius,softZone,rate,skin});this.corrected=false;this.stats={};
 }
 recover(point){
  const safe=point.slice(),encountered=new Set();let iterations=0;
  for(;iterations<12;iterations++){
   const hit=this.index.sweep(safe,safe,this.radius);
   if(!hit)return {point:safe,recovered:true,iterations};
   encountered.add(this.index.records.get(hit.id));
   for(let i=0;i<3;i++)safe[i]+=hit.normal[i]*(hit.penetration+this.skin);
  }
  // Opposing nearest faces in overlapping houses can oscillate. Only in this
  // exceptional recovery, expand a finite envelope of encountered volumes and
  // choose its nearest clear exit. No full-scene scan or infinite columns.
  for(let expansion=0;expansion<12;expansion++){
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(const box of encountered)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],box.worldMin[i]);hi[i]=Math.max(hi[i],box.worldMax[i]);}
   const candidates=[];
   for(let axis=0;axis<3;axis++)for(const side of [-1,1]){const p=point.slice();p[axis]=side<0?lo[axis]-this.radius-this.skin:hi[axis]+this.radius+this.skin;candidates.push(p);}
   candidates.sort((a,b)=>distance(a,point)-distance(b,point));
   let grew=false;
   for(const candidate of candidates){
    const hit=this.index.sweep(candidate,candidate,this.radius);
    if(!hit)return {point:candidate,recovered:true,iterations:iterations+expansion+1};
    const box=this.index.records.get(hit.id);if(!encountered.has(box)){encountered.add(box);grew=true;}
   }
   if(!grew)break;
  }
  return {point:safe,recovered:false,iterations};
 }
 resolve(eye,previous,seconds,{reset=false}={}){
  if(eye.length!==3||eye.some(x=>!Number.isFinite(x))||!Number.isFinite(seconds)||seconds<0)throw Error('Invalid camera exclusion pose');
  const recovery=this.recover(reset||!previous?eye:previous),start=recovery.point;
  if(!recovery.recovered){this.stats={unresolved:true,recoveryIterations:recovery.iterations};return start;}
  const delta=eye.map((x,i)=>x-start[i]),soft=this.index.sweep(start,eye,this.radius+this.softZone);
  const smooth=!reset&&previous&&(soft||this.corrected),factor=smooth?1-Math.exp(-this.rate*Math.min(seconds,.1)):1;
  let goal=start.map((x,i)=>x+delta[i]*factor),position=start.slice(),contacts=0;
  for(;contacts<4;contacts++){
   const hit=this.index.sweep(position,goal,this.radius);
   if(!hit){position=goal;break;}
   const remainder=goal.map((x,i)=>x-hit.point[i]),inward=remainder.reduce((sum,x,i)=>sum+x*hit.normal[i],0);
   position=hit.point.map((x,i)=>x+hit.normal[i]*this.skin);
   goal=position.map((x,i)=>x+remainder[i]-Math.min(0,inward)*hit.normal[i]);
  }
  const final=this.recover(position);this.corrected=distance(final.point,eye)>this.skin;
  this.stats={unresolved:!final.recovered,contacts,recoveryIterations:recovery.iterations+final.iterations,corrected:this.corrected};
  return final.point;
 }
}

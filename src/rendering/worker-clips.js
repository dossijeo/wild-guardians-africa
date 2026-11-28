import {Quaternion} from 'three';
const cache=new WeakMap();
// The imported fall has a late recoil in the cervical/upper-spine chain after
// the body has reached the floor. Settle that chain continuously instead of
// replaying the rebound; retain the impact and exact final recovery boundary.
export function prepareWorkerClips(clips){
 if(cache.has(clips))return cache.get(clips);
 const result=clips.map(source=>{
  if(source.name!=='Fall')return source;
  const clip=source.clone(),start=2,finish=clip.duration;
  for(const track of clip.tracks){
   if(!/^mixamorig(?:Head|Neck|Spine|Spine1)\.quaternion$/.test(track.name))continue;
   const interpolant=track.createInterpolant(),a=new Quaternion().fromArray(interpolant.evaluate(start)).normalize(),b=new Quaternion().fromArray(interpolant.evaluate(finish)).normalize(),q=new Quaternion();
   for(let i=0;i<track.times.length;i++){
    const time=track.times[i];if(time<=start||time>=finish)continue;
    const t=(time-start)/(finish-start),mix=t*t*(3-2*t);
    q.slerpQuaternions(a,b,mix).toArray(track.values,i*4);
   }
  }
  return clip;
 });
 cache.set(clips,result);return result;
}

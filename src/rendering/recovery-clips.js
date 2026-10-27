import {AnimationClip,QuaternionKeyframeTrack,VectorKeyframeTrack} from 'three';

// Shared immutable float views: no JSON number arrays retained during play.
export function decodeRecoveryClips(manifest,bytes){
 if(manifest.schema!=='wg-recovery/1'||manifest.byteLength!==bytes.byteLength)throw Error('Invalid recovery bank');
 const result=new Map();
 function values(span){if(!Number.isInteger(span.offset)||!Number.isInteger(span.length)||span.offset<0||span.length<=0||span.offset%4||span.offset+span.length*4>bytes.byteLength)throw Error('Invalid recovery span');return new Float32Array(bytes,span.offset,span.length);}
 for(const entry of manifest.clips){
  if(result.has(entry.species))throw Error('Duplicate recovery species');const times=values(entry.times);
  if(times[0]!==0||Math.abs(times[times.length-1]-entry.duration)>.001)throw Error('Invalid recovery duration');
  for(let i=0;i<times.length;i++)if(!Number.isFinite(times[i])||i&&times[i]<=times[i-1])throw Error('Invalid recovery time');
  const tracks=entry.tracks.map(track=>{const Type=track.type==='quaternion'?QuaternionKeyframeTrack:track.type==='vector'?VectorKeyframeTrack:null,size=track.type==='quaternion'?4:3,frames=values(track.values);if(!Type||frames.length!==times.length*size||!frames.every(Number.isFinite))throw Error('Invalid recovery channel');return new Type(track.name,times,frames);});
  result.set(entry.species,new AnimationClip(entry.name,entry.duration,tracks));
 }
 return result;
}
export async function loadRecoveryClips(){
 const base='/content/guardian/recovery/';const [meta,data]=await Promise.all([fetch(base+'recovery.json'),fetch(base+'recovery.bin')]);
 if(!meta.ok||!data.ok)throw Error('Recovery bank unavailable');return decodeRecoveryClips(await meta.json(),await data.arrayBuffer());
}

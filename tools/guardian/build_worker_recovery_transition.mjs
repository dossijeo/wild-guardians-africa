// Offline transition from each native Fall endpoint into the supplied stand-up.
import fs from 'node:fs';
import {AnimationMixer,AnimationClip,VectorKeyframeTrack,QuaternionKeyframeTrack,LoopOnce,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigForSampling} from '../prepare_watering_emitters.mjs';
import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
const records=JSON.parse(fs.readFileSync('public/content/worker-actions.json'));
const blendSeconds=.4,riseSeconds=2.8,duration=blendSeconds+riseSeconds;
for(const [profile,record] of Object.entries(records)){
 const gltf=await new GLTFLoader().parseAsync(rigForSampling(fs.readFileSync('public'+record.url)),'');
 const root=gltf.scene,hip=root.getObjectByName('mixamorigHips'),carrier=root.getObjectByName('Quata_Character');
 if(!hip||!carrier)throw Error('Missing worker root '+profile);
 const nodes=[];root.traverse(n=>{if(n.name)nodes.push(n);});
 const snapshot=()=>nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()}));
 const rest=snapshot(),restore=pose=>nodes.forEach((n,i)=>{n.position.copy(pose[i].p);n.quaternion.copy(pose[i].q);n.scale.copy(pose[i].s);});
 const mixer=new AnimationMixer(root),fall=gltf.animations.find(c=>c.name==='Fall');
 const sample=(clip,time)=>{mixer.stopAllAction();restore(rest);const a=mixer.clipAction(clip).reset().setLoop(LoopOnce,1).play();a.paused=true;a.time=time;a.clampWhenFinished=true;mixer.update(0);root.updateMatrixWorld(true);};
 sample(fall,fall.duration);const fallen=snapshot(),fallenHip=hip.getWorldPosition(new Vector3());
 const data=JSON.parse(fs.readFileSync(`content/source/animations/stand-up/workers/${profile}-candidate.json`));
 const rise=AnimationClip.parse(data.clip);sample(rise,0);
 const offset=fallenHip.clone().sub(hip.getWorldPosition(new Vector3()));offset.y=0;
 const parentQ=carrier.parent.getWorldQuaternion(carrier.quaternion.clone());
 const localOffset=offset.clone().applyQuaternion(parentQ.invert());
 sample(rise,rise.duration);carrier.position.add(localOffset);root.updateMatrixWorld(true);const finalHip=hip.getWorldPosition(new Vector3());
 sample(gltf.animations.find(c=>c.name==='Idle'),0);const idleHip=hip.getWorldPosition(new Vector3());
 const finalOffset=finalHip.sub(idleHip);finalOffset.y=0;carrier.position.add(finalOffset);const standing=snapshot();
 const contact=BeastRecovery.contactSamples(root),v=new Vector3(),times=[],channels=nodes.map(()=>({p:[],q:[],s:[]}));
 let maxLift=0;
 for(let frame=0;frame<=192;frame++){
  const time=frame/60,t=Math.min(1,time/blendSeconds),mix=t*t*(3-2*t);
  sample(rise,Math.max(0,time-blendSeconds)/riseSeconds*rise.duration);
  carrier.position.add(localOffset);
  nodes.forEach((n,i)=>{n.position.lerpVectors(fallen[i].p,n.position,mix);n.quaternion.slerp(fallen[i].q,1-mix);n.scale.lerpVectors(fallen[i].s,n.scale,mix);});
  const endT=Math.max(0,Math.min(1,(time-(duration-.25))/.25)),endMix=endT*endT*(3-2*endT);
  if(endMix)nodes.forEach((n,i)=>{n.position.lerp(standing[i].p,endMix);n.quaternion.slerp(standing[i].q,endMix);n.scale.lerp(standing[i].s,endMix);});
  // Keep the source's hidden work props hidden throughout recovery.
  for(const name of ['Prop_WateringCan','Prop_FruitCrate','Prop_HarvestSack','Prop_Hoe'])root.getObjectByName(name)?.scale.setScalar(0);
  root.updateMatrixWorld(true);let min=Infinity;
  for(const {mesh,index} of contact){mesh.getVertexPosition(index,v).applyMatrix4(mesh.matrixWorld);min=Math.min(min,v.y);}
  // Preserve exact incoming pose at t=0; smoothly establish floor contact.
  const correction=-min*mix*(1-endMix);carrier.position.y+=correction;maxLift=Math.max(maxLift,Math.abs(correction));
  times.push(time);nodes.forEach((n,i)=>{n.position.toArray(channels[i].p,channels[i].p.length);n.quaternion.toArray(channels[i].q,channels[i].q.length);n.scale.toArray(channels[i].s,channels[i].s.length);});
 }
 let boundaryPositionError=0,boundaryAngleError=0;
 nodes.forEach((n,i)=>{boundaryPositionError=Math.max(boundaryPositionError,fallen[i].p.distanceTo(new Vector3().fromArray(channels[i].p)));boundaryAngleError=Math.max(boundaryAngleError,fallen[i].q.clone().normalize().angleTo(n.quaternion.clone().fromArray(channels[i].q).normalize()));});
 if(boundaryPositionError>1e-6||boundaryAngleError>1e-6)throw Error('Discontinuous recovery boundary '+profile);
 const tracks=nodes.flatMap((n,i)=>[new VectorKeyframeTrack(n.name+'.position',times,channels[i].p),new QuaternionKeyframeTrack(n.name+'.quaternion',times,channels[i].q),new VectorKeyframeTrack(n.name+'.scale',times,channels[i].s)]);
 const result={profile,sourceSha256:data.sourceSha256,targetSha256:record.sha256,blendSeconds,riseSeconds,horizontalOffset:offset.toArray(),finalOffset:finalOffset.toArray(),maxGroundCorrection:maxLift,boundaryPositionError,boundaryAngleError,scope:'Candidate transition. Final logical-root reconciliation and production state integration pending.',clip:AnimationClip.toJSON(new AnimationClip('Worker_GetUp',duration,tracks))};
 fs.writeFileSync(`content/source/animations/stand-up/workers/${profile}-transition.json`,JSON.stringify(result));
 console.log({profile,offset:result.horizontalOffset,maxLift});
}

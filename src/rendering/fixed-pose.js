// These actors use paused actions driven by simulation timestamps. Repeating
// an identical sample does not need another AnimationMixer evaluation.
const samples=new WeakMap();
export function sampleFixedPose(data,time,restart=false){
 const action=data.action,previous=samples.get(data);
 if(!restart&&previous?.action===action&&previous.mixer===data.mixer&&previous.time===time&&action.time===time&&action.paused&&action.enabled&&action.weight===previous.weight)return false;
 action.time=time;data.mixer.update(0);
 // Reuse one record per rig rather than allocating on every changing frame.
 const sample=previous??{};sample.action=action;sample.mixer=data.mixer;sample.time=time;sample.weight=action.weight;
 if(!previous)samples.set(data,sample);return true;
}

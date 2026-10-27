export const VISEMES=Object.freeze(['A','B','C','D','E','F','G','H','X']);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Stateless sampling makes seek, pause, dropped frames and playbackRate deterministic.
export function sampleVisemes(cues,time,duration,blend=.035){
 const weights=Object.fromEntries(VISEMES.map(v=>[v,0]));
 if(!cues?.length||!Number.isFinite(time)||time<0||time>=duration){weights.X=1;return weights;}
 let lo=0,hi=cues.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(cues[mid].end<=time)lo=mid+1;else hi=mid;}
 const cue=cues[lo];if(!cue||time<cue.start){weights.X=1;return weights;}
 weights[cue.value]=1;
 // Short cues use a smaller blend interval so neighboring transitions cannot overlap.
 const width=Math.min(blend,(cue.end-cue.start)/3);
 const previous=cues[lo-1],next=cues[lo+1];
 if(time<cue.start+width){const a=smooth((time-cue.start+width)/(2*width));weights[cue.value]=a;weights[previous?.value??'X']+=1-a;}
 else if(time>cue.end-width){const a=smooth((time-cue.end+width)/(2*width));weights[cue.value]=1-a;weights[next?.value??'X']+=a;}
 return weights;
}
export function blinkAt(time){
 // Deterministic irregular intervals, independent of render cadence.
 const period=17.3,t=((time%period)+period)%period;
 for(const center of [3.1,7.8,12.4,12.77]){const d=Math.abs(t-center);if(d<.11)return Math.cos(d/.11*Math.PI/2)**2;}
 return 0;
}
export class GuardianFace {
 constructor(root,{fetchJson=url=>fetch(url).then(r=>{if(!r.ok)throw Error(`Lip sync ${r.status}`);return r.json();}),resolve=path=>path}={}){
  this.meshes=[];root.traverse(o=>{if(o.morphTargetDictionary)this.meshes.push(o);});this.fetchJson=fetchJson;this.resolve=resolve;this.ticket=0;this.cache=new Map();this.data=null;this.error=null;
 }
 async setRecord(record){
  const ticket=++this.ticket;this.data=null;this.error=null;this.reset();
  if(!record)return;
  try{let data=this.cache.get(record.id);if(!data){data=await this.fetchJson(this.resolve(`content/guardian/lipsync/${record.id}.json`));if(data.id!==record.id||data.audio!==record.path)throw Error('Lip sync/audio mismatch');this.cache.set(record.id,data);}if(ticket===this.ticket)this.data=data;}
  catch(error){if(ticket===this.ticket)this.error=error;}
 }
 set(name,value){for(const mesh of this.meshes){const i=mesh.morphTargetDictionary[name];if(i!==undefined)mesh.morphTargetInfluences[i]=clamp(value,0,1);}}
 reset(){for(const mesh of this.meshes)mesh.morphTargetInfluences.fill(0);}
 update(audio,time,{viseme=null,blink=null,expression=null,reduced=false}={}){
  const talking=audio&&!audio.ended&&Number.isFinite(audio.currentTime)&&this.data;
  const weights=sampleVisemes(talking?this.data.mouthCues:null,talking?audio.currentTime:0,this.data?.duration??0);
  for(const v of VISEMES)this.set('viseme_'+v,viseme===null?weights[v]:Number(v===viseme));
  const pause=talking?this.data.pauses?.find(p=>audio.currentTime>=p.start&&audio.currentTime<=p.end):null;
  const pauseBlink=pause?Math.max(0,1-Math.abs(audio.currentTime-(pause.start+pause.end)/2)/.10):0;
  const closed=blink??(reduced?0:Math.max(blinkAt(time),pauseBlink));this.set('blink_L',closed);this.set('blink_R',closed);
  for(const e of ['joy','focus','surprise'])this.set(e,e===expression?.name?expression.value:0);
 }
 dispose(){this.ticket++;this.cache.clear();this.reset();}
}

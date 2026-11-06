// The media element stays on the UI thread. The graphic worker receives a
// compact sample and follows the media clock for a bounded period only.
const MAX_EXTRAPOLATION_SECONDS=.25;
export function createGuardianNarrationSender({send,clock=()=>performance.now(),intervalMs=100}={}){
 if(typeof send!=='function'||typeof clock!=='function'||!Number.isFinite(intervalMs)||intervalMs<=0)throw TypeError('Invalid guardian narration sender');
 let serial=0,last=null,lastSent=-Infinity,closed=false;
 return {
  update(record,audio){
   if(closed)return false;
   const next=record&&typeof record.id==='string'&&record.id&&typeof record.path==='string'&&record.path?{record:{id:record.id,path:record.path},audio:audio&&Number.isFinite(audio.currentTime)&&audio.currentTime>=0?{currentTime:audio.currentTime,paused:audio.paused===true||Number.isFinite(audio.readyState)&&audio.readyState<3,ended:audio.ended===true,playbackRate:Number.isFinite(audio.playbackRate)&&audio.playbackRate>=0?audio.playbackRate:1}:null}:null;
   const now=clock(),key=value=>JSON.stringify([value?.record?.id,value?.record?.path,!!value?.audio,value?.audio?.paused,value?.audio?.ended,value?.audio?.playbackRate]);
   const expected=last?.audio&&!last.audio.paused&&!last.audio.ended?last.audio.currentTime+Math.max(0,now-lastSent)/1000*last.audio.playbackRate:last?.audio?.currentTime;
   const seek=next?.audio&&Number.isFinite(expected)&&Math.abs(next.audio.currentTime-expected)>.12;
   if(key(next)===key(last)&&!seek&&(!next?.audio||next.audio.paused||next.audio.ended||now-lastSent<intervalMs))return false;
   send({sequence:++serial,narration:next});last=next;lastSent=now;return true;
  },
  dispose(){closed=true;last=null;},
 };
}

export function createGuardianNarrationReceiver({clock=()=>performance.now()}={}){
 if(typeof clock!=='function')throw TypeError('Invalid guardian narration clock');
 let sequence=0,record=null,audio=null,receivedAt=0,closed=false;
 return {
  accept(message){
   if(closed||!Number.isSafeInteger(message?.sequence)||message.sequence<=sequence)return false;
   const value=message.narration;
   if(value!==null&&(!value||typeof value.record?.id!=='string'||!value.record.id||typeof value.record?.path!=='string'||!value.record.path||value.audio!==null&&(!value.audio||!Number.isFinite(value.audio.currentTime)||value.audio.currentTime<0||typeof value.audio.paused!=='boolean'||typeof value.audio.ended!=='boolean'||!Number.isFinite(value.audio.playbackRate)||value.audio.playbackRate<0)))return false;
   sequence=message.sequence;record=value?.record?{...value.record}:null;audio=value?.audio?{...value.audio}:null;receivedAt=clock();return true;
  },
  sample(){
   if(closed)return {record:null,audio:null};
   const elapsed=audio&&!audio.paused&&!audio.ended?Math.min(MAX_EXTRAPOLATION_SECONDS,Math.max(0,(clock()-receivedAt)/1000))*audio.playbackRate:0;
   return {record,audio:audio?{currentTime:audio.currentTime+elapsed,paused:audio.paused,ended:audio.ended}:null};
  },
  dispose(){closed=true;record=null;audio=null;},
 };
}

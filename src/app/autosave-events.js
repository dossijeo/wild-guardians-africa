// Event IDs belong to a single simulation. Use the frame's own pre-tick tail,
// never a marker shared by different slots or a search through older history.
const boundaries=new Set(['Dawn','RaidEnded','CampaignWon','GameOver']);
export function autosaveEventAfter(events,previousId){
 const index=previousId===undefined?-1:events.findIndex(e=>e.id===previousId);
 return events.slice(index+1).findLast(e=>boundaries.has(e.type))??null;
}

// Worker publications already contain only newly confirmed events. Save once
// per batch, after reconciliation; never rescan the bounded event history.
export function autosaveConfirmedEvents(events,save){
 if(!Array.isArray(events)||typeof save!=='function')throw TypeError('Invalid confirmed autosave');
 return events.some(event=>boundaries.has(event?.type))?save():false;
}

// Preserve a failed boundary while physics or a cinematic makes checkpoints
// unavailable. Retry only on a later confirmed availability transition, never
// from the render loop or recursively from an unavailable checkpoint.
export function createConfirmedAutosaveController({request,isCurrent=()=>true,onError=()=>{}}={}){
 if(typeof request!=='function'||typeof isCurrent!=='function'||typeof onError!=='function')throw TypeError('Invalid confirmed autosave controller');
 let pending=false,running=false,waiting=false,sawUnavailable=false,available=null,availabilityEpoch=0,availabilitySequence=null,blockedSequence=null,closed=false;
 function run(){
  if(closed||!isCurrent()||running||waiting||!pending)return;
  pending=false;running=true;const startedEpoch=availabilityEpoch;let result;
  try{result=request();}catch(error){result=Promise.reject(error);}
  Promise.resolve(result).then(value=>{
   if(closed||!isCurrent())return;
   if(value?.saved===true)return;
   if(value?.saved===false&&value.reason==='physics-active'){
    pending=true;blockedSequence=availabilitySequence!==null&&Number.isSafeInteger(value.sequence)&&value.sequence>=0?value.sequence:null;waiting=blockedSequence!==null?!(available===true&&availabilitySequence>blockedSequence):!(available===true&&availabilityEpoch>startedEpoch);sawUnavailable=available===false;return;
   }
   throw Error('Invalid autosave checkpoint result');
  }).catch(error=>{if(!closed&&isCurrent()){pending=false;waiting=false;try{onError(error);}catch{}}}).finally(()=>{running=false;if(!closed&&isCurrent()&&pending&&!waiting)run();});
 }
 return {
  events(events){if(closed)return false;return autosaveConfirmedEvents(events,()=>{pending=true;run();return true;});},
  observe(value,sequence=null){if(closed)return;if(typeof value!=='boolean'||sequence!==null&&(!Number.isSafeInteger(sequence)||sequence<0))throw TypeError('Invalid checkpoint availability');if(sequence!==null&&availabilitySequence!==null&&sequence<availabilitySequence)return;if(available===false&&value)availabilityEpoch++;available=value;if(sequence!==null)availabilitySequence=sequence;if(waiting){if(!value)sawUnavailable=true;else if(blockedSequence!==null?sequence!==null&&sequence>blockedSequence:sawUnavailable){waiting=false;sawUnavailable=false;blockedSequence=null;run();}}},
  status(){return {pending,running,waiting,closed};},
  dispose(){closed=true;pending=false;waiting=false;}
 };
}

// Owns presentation-side profile persistence while tutorial decisions remain
// in the simulation. Every action enters the same ordered runtime command log.
export function createWorkerTutorialBridge({runtime,profile,narrating=()=>null,onError=()=>{},onChange=()=>{},clock=()=>performance.now()}){
 if(typeof runtime?.submit!=='function'||typeof profile?.read!=='function'||typeof profile?.record!=='function'||typeof clock!=='function')throw TypeError('Invalid worker tutorial bridge');
 let current=null,started=false,closed=false,updatePending=false,presentedKey=null,presentTicket=0,presentRetryAt=0,advancePending=false;const advanceQueue=[];
 function apply(result){
  if(closed)return null;const data=result?.value;if(!data||!Array.isArray(data.profileRecords))throw Error('Invalid worker tutorial response');
  for(const id of data.profileRecords)try{profile.record(id);}catch(error){onError(error);}
  const before=JSON.stringify(current);current=data.presentation??null;if(JSON.stringify(current)!==before){presentedKey=null;presentRetryAt=0;onChange();}return data.value;
 }
 function command(action,fields={}){
  if(closed)return Promise.reject(Error('Tutorial bridge closed'));
  const result=runtime.submit({kind:'tutorialCommand',action,narrating:narrating(),...fields}).then(apply);result.catch(onError);return result;
 }
 function flushAdvance(){
  if(closed||advancePending||!advanceQueue.length)return;const next=advanceQueue.shift();advancePending=true;
  command('advance',next).then(value=>{if(value)onChange({dismissed:true});}).finally(()=>{advancePending=false;flushAdvance();}).catch(()=>{});
 }
 return {
  worker:true,
  async start(){if(started||closed)throw Error('Tutorial bridge cannot start');started=true;return apply(await runtime.submit({kind:'tutorialStart',seen:[...profile.read()]}));},
  presentation({record=true}={}){if(record&&current){const key=JSON.stringify([current.id,current.variant,current.reading]);if(key!==presentedKey&&clock()>=presentRetryAt){presentedKey=key;const ticket=++presentTicket;command('present').catch(()=>{if(!closed&&ticket===presentTicket&&presentedKey===key){presentedKey=null;presentRetryAt=clock()+1000;}});}}return current;},
  update(){if(!started||closed||updatePending)return;updatePending=true;command('update').finally(()=>{updatePending=false;}).catch(()=>{});},
  present(){return command('present');},
  dismiss({automatic=false,message=current}={}){if(!message)return Promise.resolve(false);return command('dismiss',{automatic,messageId:message.id,variant:message.variant??null});},
  skipBasic(){return command('skip');},
  advance(seconds,{visible=true}={}){if(!started||closed||!seconds)return false;const voice=narrating(),last=advanceQueue.at(-1);if(last&&last.visible===visible&&last.narrating===voice)last.seconds+=seconds;else advanceQueue.push({seconds,visible,narrating:voice});flushAdvance();return false;},
  dispose(){closed=true;current=null;},
 };
}

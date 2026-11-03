import {TutorialController} from '../tutorial/controller.js';
import {TUTORIAL_IDS} from '../tutorial/messages.js';

// Profile storage and voice playback belong to presentation. The controller
// owns game mutations here and reports profile writes to the caller.
export function createWorkerTutorial(state,seen){
 const allowed=new Set(TUTORIAL_IDS);if(!Array.isArray(seen)||seen.some(id=>!allowed.has(id))||new Set(seen).size!==seen.length)throw TypeError('Invalid tutorial profile');
 const profileSeen=new Set(seen),records=[];let narrated=null;
 const profile={read:()=>new Set(profileSeen),record(id){if(!allowed.has(id))throw Error('Unknown tutorial message');profileSeen.add(id);records.push(id);},get basicCompleted(){return profileSeen.has('basic.complete');}};
 const controller=new TutorialController(state,profile,{isNarrating:id=>narrated===id});
 function execute(command){
  if(command.narrating!==null&&command.narrating!==undefined&&(!allowed.has(command.narrating)))throw TypeError('Invalid narrated tutorial message');
  narrated=command.narrating??null;let value;
  if(command.action==='update'){controller.update();value=null;}
  else if(command.action==='dismiss'){
   if(typeof command.automatic!=='boolean'||typeof command.messageId!=='string')throw TypeError('Invalid tutorial dismissal');
   const message=controller.presentation({record:false});
   value=message?.id===command.messageId&&(message.variant??null)===(command.variant??null)?controller.dismiss({automatic:command.automatic,message}):false;
  }else if(command.action==='advance'){
   if(!Number.isFinite(command.seconds)||command.seconds<0||typeof command.visible!=='boolean')throw TypeError('Invalid tutorial presentation interval');
   value=controller.advance(command.seconds,{visible:command.visible});
  }else if(command.action==='skip')value=controller.skipBasic();
  else if(command.action==='present')value=controller.presentation();
  else throw TypeError('Unknown tutorial action');
  return {value,presentation:controller.presentation({record:false}),profileRecords:records.splice(0)};
 }
 return {execute};
}

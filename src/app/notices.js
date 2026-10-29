import {RAID_NOTICE_TEXT} from '../simulation/raid-notice.js';
// Keep saved message history intact; display an attack warning only for its raid.
export function visibleNotices(state,limit=3){
 const animals=state.raid?.animals??[];
 return state.messages.filter(message=>message.text!==RAID_NOTICE_TEXT||animals.some(animal=>animal.id===message.target)).slice(-limit);
}
export function tutorialCoversNotice(state,message,presentation){
 if(!presentation)return false;
 if(presentation.text?.trim()===message.text.trim()||presentation.noticeIds?.includes(message.id))return true;
 return message.text===RAID_NOTICE_TEXT&&state.raid?.animals.some(a=>a.id===message.target)&&
  ['mechanic.first-raid','magic.shield','reminder.shield'].includes(presentation.id);
}
// Presentation lifetime uses real time, without editing saved event history.
export class NoticeLifetime {
 constructor(seconds=15){this.seconds=seconds;this.entries=new Map();}
 reset(){this.entries.clear();}
 dismiss(id){const entry=this.entries.get(id);if(entry)entry.dismissed=true;}
 remaining(id,now){const entry=this.entries.get(id);return entry?.until==null?1:Math.max(0,Math.min(1,(entry.until-now)/this.seconds));}
 visible(state,now,presentation=null,{tutorialVisible=Boolean(presentation),maxVisible=3,allowAwakeningUrgent=false}={}){
  const live=new Set(state.messages.map(m=>m.id));
  for(const id of this.entries.keys())if(!live.has(id))this.entries.delete(id);
  for(const message of state.messages){
   if(!this.entries.has(message.id))this.entries.set(message.id,{until:null,dismissed:false});
   if(tutorialCoversNotice(state,message,presentation))this.entries.get(message.id).dismissed=true;
  }
  // Unrelated notices wait behind the tutorial, without spending their readable
  // lifetime in an invisible stack. Duplicate explanations never reappear.
  if(presentation||tutorialVisible){
   // Show one urgent magic warning only when the caller has verified a clear
   // area above the tutorial. All other notices keep their readable lifetime.
   const urgent=allowAwakeningUrgent?visibleNotices(state,state.messages.length).filter(m=>
    ['awakening-threat','awakening-lost'].includes(m.category)&&!this.entries.get(m.id).dismissed).slice(-1):[];
   const shown=new Set(urgent.map(m=>m.id));
   for(const [id,entry] of this.entries){
    if(shown.has(id)){if(entry.hiddenAt!==undefined){entry.until+=now-entry.hiddenAt;delete entry.hiddenAt;}}
    else if(entry.until!==null)entry.hiddenAt??=now;
   }
   return urgent.filter(m=>{const entry=this.entries.get(m.id);entry.until??=now+this.seconds;return now<entry.until;});
  }
  for(const entry of this.entries.values())if(entry.hiddenAt!==undefined){entry.until+=now-entry.hiddenAt;delete entry.hiddenAt;}
  return visibleNotices(state,maxVisible).filter(m=>{const entry=this.entries.get(m.id);if(entry.dismissed)return false;entry.until??=now+this.seconds;return now<entry.until;});
 }
}

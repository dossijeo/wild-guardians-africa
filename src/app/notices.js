import {RAID_NOTICE_TEXT} from '../simulation/raid-notice.js';
// Keep saved message history intact; display an attack warning only for its raid.
export function visibleNotices(state){
 const animals=state.raid?.animals??[];
 return state.messages.filter(message=>message.text!==RAID_NOTICE_TEXT||animals.some(animal=>animal.id===message.target)).slice(-3);
}
// Presentation lifetime uses real time, without editing saved event history.
export class NoticeLifetime {
 constructor(seconds=15){this.seconds=seconds;this.entries=new Map();}
 reset(){this.entries.clear();}
 dismiss(id){const entry=this.entries.get(id);if(entry)entry.dismissed=true;}
 visible(state,now){
  const live=new Set(state.messages.map(m=>m.id));
  for(const id of this.entries.keys())if(!live.has(id))this.entries.delete(id);
  for(const message of state.messages)if(!this.entries.has(message.id))this.entries.set(message.id,{until:now+this.seconds,dismissed:false});
  return visibleNotices(state).filter(m=>{const entry=this.entries.get(m.id);return !entry.dismissed&&now<entry.until;});
 }
}

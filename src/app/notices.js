import {RAID_NOTICE_TEXT} from '../simulation/raid-notice.js';
// Keep saved message history intact; display an attack warning only for its raid.
export function visibleNotices(state){
 const animals=state.raid?.animals??[];
 return state.messages.filter(message=>message.text!==RAID_NOTICE_TEXT||animals.some(animal=>animal.id===message.target)).slice(-3);
}

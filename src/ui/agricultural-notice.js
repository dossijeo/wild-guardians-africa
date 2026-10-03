// Associate the announcement with this dawn, not an older retained notice.
export function agriculturalDawnMessage(state){
 const event=state.events.findLast(e=>e.type==='AgriculturalEventApplied'&&e.day===state.day);
 return event?state.messages.find(m=>m.id===event.noticeId)?.text??null:null;
}

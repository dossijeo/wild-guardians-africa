// Per-save daily history, independent of the permanent tutorial profile.
// Continuing an unfinished reading is not a second presentation.
export function dailyTutorialMessages(state){
 const tutorial=state.tutorial;
 if(tutorial.shownToday?.day!==state.day)tutorial.shownToday={day:state.day,ids:[]};
 return tutorial.shownToday.ids;
}
export function tutorialMessageShownToday(state,id){return dailyTutorialMessages(state).includes(id);}
export function recordTutorialMessageToday(state,id){
 const ids=dailyTutorialMessages(state);if(ids.includes(id))return false;
 ids.push(id);return true;
}

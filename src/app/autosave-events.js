// Event IDs belong to a single simulation. Use the frame's own pre-tick tail,
// never a marker shared by different slots or a search through older history.
const boundaries=new Set(['Dawn','RaidEnded','CampaignWon','GameOver']);
export function autosaveEventAfter(events,previousId){
 const index=previousId===undefined?-1:events.findIndex(e=>e.id===previousId);
 return events.slice(index+1).findLast(e=>boundaries.has(e.type))??null;
}

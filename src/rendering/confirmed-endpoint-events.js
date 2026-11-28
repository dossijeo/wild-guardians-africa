// This only certifies event timing, never movement or a pose. The receiver must
// still validate the publication, and the historical group must certify every
// actor, terrain revision, effect and physics dependency. Events are delivered
// by the normal commit, after playback reaches this exact confirmed endpoint.
export function confirmedEventsAtEndpoint(message,start,end){
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Array.isArray(message?.events)||message.settlements?.length||message.motionInvalidation)return false;
 const events=message.events,journal=message.presentationJournal??[];
 if(!Array.isArray(journal))return false;
 if(!events.length)return journal.length===0;
 if(message.presentationJournalVersion!==2||journal.length!==events.length)return false;
 const ids=new Set();
 return events.every((event,index)=>{
  const fact=journal[index];
  if(typeof event?.id!=='string'||!event.id||ids.has(event.id)||event.simulationTime!==end||fact?.kind!=='event'||fact.eventId!==event.id||fact.at!==end)return false;
  ids.add(event.id);return true;
 });
}

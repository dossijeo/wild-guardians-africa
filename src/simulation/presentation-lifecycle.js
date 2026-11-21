// Presentation-only facts never mutate game state or consume its event sequence.
const listeners=new WeakMap();
export function publishAnimalGone(state,actorId){
 if(typeof actorId!=='string'||!actorId)throw TypeError('Invalid animal lifecycle identity');
 for(const listener of listeners.get(state)??[])listener({kind:'animalGone',actorId});
}
export function createPresentationLifecycleJournal(state,observeEvents){
 if(!state||typeof observeEvents!=='function')throw TypeError('Invalid presentation lifecycle observer');
 let queue=[],closed=false;const collect=fact=>queue.push({...fact,at:state.elapsed});let set=listeners.get(state);if(!set){set=new Set();listeners.set(state,set);}set.add(collect);
 const stop=observeEvents(state,event=>queue.push({kind:'event',eventId:event.id,at:state.elapsed}));
 return {drain(){if(closed)throw Error('Presentation lifecycle journal closed');const value=queue;queue=[];return value;},dispose(){if(closed)return;closed=true;stop();set.delete(collect);if(!set.size)listeners.delete(state);queue=[];}};
}

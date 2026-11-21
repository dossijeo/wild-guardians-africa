// Experimental in-memory receiver; effect and record are not transactional.
export function createReplayEventReceiver(){
 const accepted=new Map();return {
  apply(event,effect){if(!event||typeof event.id!=='string'||!event.id||typeof effect!=='function')throw Error('Invalid event');const value=JSON.stringify(event),previous=accepted.get(event.id);if(previous!==undefined){if(previous!==value)throw Error('Conflicting event identity');return false;}effect(event);accepted.set(event.id,value);return true;},
  size(){return accepted.size;}
 };
}

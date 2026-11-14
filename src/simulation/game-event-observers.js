// Observer registries are session-local and deliberately excluded from saves.
// Presentation may subscribe to locally emitted events and separately receive
// confirmed remote events without executing simulation mutations again.
const eventObservers=new WeakMap(),presentationEventObservers=new WeakMap();

export function observeGameEvents(state,callback){
 if(typeof callback!=='function')throw TypeError('Expected a game event observer');
 let listeners=eventObservers.get(state);if(!listeners){listeners=new Set();eventObservers.set(state,listeners);}
 listeners.add(callback);return ()=>listeners.delete(callback);
}
export function observePresentationGameEvents(state,callback){
 if(typeof callback!=='function')throw TypeError('Expected a presentation event observer');
 let listeners=presentationEventObservers.get(state);if(!listeners){listeners=new Set();presentationEventObservers.set(state,listeners);}
 const listener=event=>callback(event),stop=observeGameEvents(state,listener);listeners.add(listener);
 return ()=>{listeners.delete(listener);stop();};
}
export function notifyConfirmedPresentationEvent(state,event){
 if(!event||typeof event!=='object'||typeof event.id!=='string'||typeof event.type!=='string')throw TypeError('Expected a confirmed game event');
 for(const callback of presentationEventObservers.get(state)??[])callback(event);
}
export function dispatchLocalGameEvent(state,event){for(const callback of eventObservers.get(state)??[])callback(event);}

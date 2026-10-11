// Optional, external presentation observers. Never serialized with the ledger.
// Notifications follow successful settlement; observer failures cannot undo or
// interrupt a transaction. Without listeners only a weak lookup is performed.
const observers=new WeakMap();
export function observeSettlements(ledger,listener){
 let listeners=observers.get(ledger);if(!listeners){listeners=new Set();observers.set(ledger,listeners);}listeners.add(listener);
 return ()=>{listeners.delete(listener);if(!listeners.size)observers.delete(ledger);};
}
export function notifySettlement(ledger,id,delta){
 const listeners=observers.get(ledger);if(listeners)for(const listener of listeners){try{listener(id,delta.n,delta.d);}catch(error){console.error('Settlement presentation observer failed',error);}}
}

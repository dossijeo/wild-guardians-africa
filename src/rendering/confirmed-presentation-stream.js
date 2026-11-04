import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';

// A presentation Worker consumes its own ordered state stream. It never
// advances simulation and only releases terrain after state reconciliation.
export function createConfirmedPresentationStream({port,session,state,terrain,onError=()=>{},onConfirmed=()=>{}}={}){
 if(!port||typeof port.postMessage!=='function'||typeof session!=='string'||!session||typeof terrain?.confirm!=='function'||typeof onError!=='function'||typeof onConfirmed!=='function')throw TypeError('Invalid presentation stream');
 const receiver=createConfirmedStateReceiver(state,session);let closed=false;
 function fail(error){if(closed)return;closed=true;try{port.close();}catch{}try{onError(error instanceof Error?error:Error(String(error)));}catch{}}
 port.onmessage=({data})=>{if(closed)return;try{
  if(data?.kind==='presentationFailure'&&data.session===session)throw Error(data.message||'Presentation stream failed');
  if(data?.kind!=='publication'||data.session!==session||!data.publication)throw Error('Invalid presentation publication');
  const message=data.publication,firstSequence=data.firstSequence??message.sequence;
  if(firstSequence!==message.sequence&&data.tick!==true&&!(data.backgroundView===true&&message.unchanged===true))throw Error('Invalid coalesced presentation');
  const accepted=message.unchanged===true?receiver.acceptUnchanged(message,{firstSequence}):receiver.accept(message,{firstSequence});if(!accepted.accepted)throw Error('Presentation publication rejected: '+accepted.reason);
  terrain.confirm(message.sequence);onConfirmed(message);port.postMessage({kind:'publicationAck',session,sequence:message.sequence});
 }catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Presentation publication transfer failed'));port.start?.();
 return {dispose(){if(closed)return;closed=true;port.close();},status(){return {closed,...receiver.status()};}};
}

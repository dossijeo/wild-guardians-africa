import {createHostPublicationQueue} from './host-publication-queue.js';
// Stop admission halfway to the existing fail-safe. One authority result may
// be in flight; every event/pose remains ordered while presentation catches up.
const VISUAL_HIGH_WATERMARK=128;
export function openVisualStream(port,session,onReady,{diagnostics=false}={}){
 let active=true,queue=createHostPublicationQueue({session,diagnostics,foldViews:true,send:message=>port.postMessage(message)});
 function fail(error){if(!active)return;active=false;queue=null;try{port.postMessage({kind:'presentationFailure',session,message:String(error?.message??error)});}catch{}try{port.close();}catch{}onReady();}
 port.onmessage=({data})=>{if(!active)return;try{if(data?.kind!=='publicationAck'||data.session!==session)throw Error('Invalid presentation acknowledgement');queue.ack(data.sequence);onReady();}catch(error){fail(error);}};
 port.onmessageerror=()=>fail(Error('Presentation acknowledgement failed'));port.start?.();
 return {status(){return active?{active,...queue.status()}:{active};},blocked(){return active&&queue.status().queued>=VISUAL_HIGH_WATERMARK;},publish(message,tick,options){if(!active)return;try{queue.publication(message,tick,{...options,backgroundView:message.unchanged===true||options?.backgroundView===true});if(queue.status().queued>256)throw Error('Presentation publication capacity exceeded');}catch(error){fail(error);}},close(){if(!active)return;active=false;queue=null;port.close();}};
}

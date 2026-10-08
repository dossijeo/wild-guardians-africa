import {deserialize} from './snapshots.js';
import {snapshotStream} from './snapshot-stream.js';

let stream,sequence=0,decodeMs;
self.onmessage=event=>{
 if(event.data?.type==='snapshot-next'){
  if(!stream||event.data.sequence!==sequence){self.postMessage({type:'snapshot-decoded',error:{name:'SnapshotWorkerError',message:'Invalid snapshot acknowledgement'}});return;}
  const next=stream.chunks.next();
  if(next.done){stream=null;self.postMessage({type:'snapshot-complete',sequence,decodeMs});}
  else self.postMessage({type:'snapshot-chunk',sequence:sequence++,...next.value});
  return;
 }
 if(event.data?.type!=='decode-snapshot')return;
 const started=performance.now();
 let state;
 try{state=deserialize(event.data.text);}catch(error){
  self.postMessage({type:'snapshot-decoded',error:{name:error.name,message:error.message}});
  return;
 }
 decodeMs=performance.now()-started;stream=snapshotStream(state);
 if(stream){sequence=0;self.postMessage({type:'snapshot-start',header:stream.header,lengths:stream.lengths,entries:stream.entries,decodeMs});}
 else self.postMessage({type:'snapshot-decoded',state,decodeMs});
};

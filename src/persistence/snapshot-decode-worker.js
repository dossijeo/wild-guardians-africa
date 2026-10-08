import {deserialize} from './snapshots.js';

self.onmessage=event=>{
 if(event.data?.type!=='decode-snapshot')return;
 const started=performance.now();
 let state;
 try{state=deserialize(event.data.text);}catch(error){
  self.postMessage({type:'snapshot-decoded',error:{name:error.name,message:error.message}});
  return;
 }
 self.postMessage({type:'snapshot-decoded',state,decodeMs:performance.now()-started});
};

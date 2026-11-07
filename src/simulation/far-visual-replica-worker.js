import {createSpatialWorld} from '../world/wild-engine/spatial-world.js';
import {restoreSpatialFarState} from '../world/wild-engine/spatial-far-state.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';

// Only terrain derivation lives here: no Game, actors, navigation or physics.
let session=null,core=null,modulePromise=null,revision=null,busy=false;
self.onmessage=async({data})=>{
 try{
  if(busy)throw Error('Overlapping far replica operations');
  if(typeof data?.session!=='string'||!data.session||session!==null&&session!==data.session)throw Error('Far replica session mismatch');
  session=data.session;busy=true;
  if(data.kind==='snapshot'){
   modulePromise??=fetch(wasmUrl).then(response=>{if(!response.ok)throw Error(`Wild Engine fetch failed: ${response.status}`);return response.arrayBuffer();}).then(bytes=>WebAssembly.compile(bytes));
   core??=createSpatialWorld(await modulePromise);
   if(data.snapshot?.revision!==data.revision)throw Error('Far replica snapshot revision mismatch');
   restoreSpatialFarState(core,data.snapshot);revision=data.revision;
   postMessage({kind:'snapshotReady',session,revision});
  }else if(data.kind==='query'){
   const {request,confirmed}=data;
   if(!Number.isSafeInteger(data.id)||data.id<1||!Number.isSafeInteger(request?.expectedSequence)||request.expectedSequence<0||!Number.isSafeInteger(confirmed?.sequence)||!Number.isFinite(confirmed?.elapsed))throw Error('Invalid far replica query');
   const valid=core&&confirmed.revision===revision&&confirmed.sequence>=request.expectedSequence&&(request.expectedRevision!=null?request.expectedRevision===revision:request.expectedSequence===confirmed.sequence);
   const result=valid?core.queryFarVisualChunk(request.cx,request.cz,{slots:request.slots}):null;
   postMessage({kind:'result',session,id:data.id,result:result?{...result,revision,sequence:confirmed.sequence,elapsed:confirmed.elapsed}:null});
  }else throw Error('Unknown far replica operation');
 }catch(error){postMessage({kind:'error',session,message:String(error?.message??error)});}
 finally{busy=false;}
};

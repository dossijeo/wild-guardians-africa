import {openCharacterPreviewStream} from './character-preview-stream.js';
import {decodeCharacterPreview} from './decode-character-preview.js';

// One auxiliary Worker serves multiple packages. GPU objects never cross this
// boundary; only verified metadata and transferable bytes leave the worker.
const sessions=new Map();
self.onmessage=async({data})=>{
 const {id,session,kind}=data??{};
 try{
  if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(session)||session<1)throw TypeError('Invalid character data request');
  if(kind==='open'){
   if(sessions.has(session))throw Error('Duplicate character data session');
   const item={controller:new AbortController(),stream:null,metadata:new Map(),nextMetadata:1};sessions.set(session,item);
   const stream=await openCharacterPreviewStream(data.url,{features:data.features,signal:item.controller.signal});
   if(sessions.get(session)!==item){stream.close();return;}item.stream=stream;self.postMessage({id,session,result:{id:stream.id,variant:stream.variant}});return;
  }
  const item=sessions.get(session);if(!item)throw Error('Character data session closed');
  if(kind==='close'){sessions.delete(session);item.controller.abort();item.stream?.close();return;}
  if(!item.stream)throw Error('Character data session not ready');
  if(kind==='preview'){const source=await item.stream.loadPreview(),bytes=await decodeCharacterPreview(source,{signal:item.controller.signal});if(sessions.get(session)!==item)return;self.postMessage({id,session,result:bytes.buffer},[bytes.buffer]);return;}
  if(kind==='metadata'){const metadata=await item.stream.loadMetadata();if(sessions.get(session)!==item)return;const metadataId=item.nextMetadata++;item.metadata.set(metadataId,metadata);self.postMessage({id,session,result:{metadataId,metadata}});return;}
  if(kind==='textures'){const metadata=item.metadata.get(data.metadataId);if(!metadata)throw Error('Invalid character metadata');const files=await item.stream.loadTextures(metadata);if(sessions.get(session)!==item)return;const entries=[...files].map(([path,bytes])=>[path,bytes.buffer]);self.postMessage({id,session,result:entries},entries.map(([,buffer])=>buffer));return;}
  throw Error('Unknown character data request');
 }catch(error){if(sessions.has(session)||kind==='open')self.postMessage({id,session,error:{name:error?.name??'Error',message:String(error?.message??error)}});}
};

import {openCharacterPreviewStream} from './character-preview-stream.js';
import {decodeCharacterPreview} from './decode-character-preview.js';
import {prepareNativeBc7Data} from './prepare-native-bc7-data.js';
import {prepareEmbeddedGlb} from './prepare-embedded-glb.js';

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
   if(sessions.get(session)!==item){stream.close();return;}item.stream=stream;self.postMessage({id,session,result:{id:stream.id,variant:stream.variant,supportsBitmaps:typeof createImageBitmap==='function'}});return;
  }
  if(kind==='embedded-glb'){
   if(sessions.has(session)||typeof data.url!=='string'||!data.url||typeof createImageBitmap!=='function')throw Error('Embedded GLB preparation unavailable');
   const item={controller:new AbortController()};sessions.set(session,item);const response=await fetch(data.url,{signal:item.controller.signal});if(!response.ok)throw Error(`GLB HTTP ${response.status}`);const declared=Number(response.headers.get('content-length'));if(Number.isFinite(declared)&&declared>256*1024*1024)throw Error('GLB exceeds limit');const buffer=await response.arrayBuffer();if(buffer.byteLength>256*1024*1024)throw Error('GLB exceeds limit');
   const result=await prepareEmbeddedGlb(new Uint8Array(buffer),{signal:item.controller.signal});if(sessions.get(session)!==item){for(const image of result.images)image.close();return;}try{self.postMessage({id,session,kind:'embedded-glb',result},[result.buffer,...result.images]);}catch(error){for(const image of result.images)image.close();throw error;}return;
  }
  const item=sessions.get(session);if(!item)throw Error('Character data session closed');
  if(kind==='close'){sessions.delete(session);item.controller.abort();item.stream?.close();return;}
  if(!item.stream)throw Error('Character data session not ready');
  if(kind==='preview'){const source=await item.stream.loadPreview(),bytes=await decodeCharacterPreview(source,{signal:item.controller.signal});if(sessions.get(session)!==item)return;self.postMessage({id,session,result:bytes.buffer},[bytes.buffer]);return;}
  if(kind==='metadata'){const metadata=await item.stream.loadMetadata();if(sessions.get(session)!==item)return;const metadataId=item.nextMetadata++;item.metadata.set(metadataId,metadata);self.postMessage({id,session,result:{metadataId,metadata}});return;}
  if(kind==='textures'){const metadata=item.metadata.get(data.metadataId);if(!metadata)throw Error('Invalid character metadata');const files=await item.stream.loadTextures(metadata);if(sessions.get(session)!==item)return;const entries=[...files].map(([path,bytes])=>[path,bytes.buffer]);self.postMessage({id,session,result:entries},entries.map(([,buffer])=>buffer));return;}
  if(kind==='compressed'){if(item.stream.variant!=='bc7')throw Error('Native BC7 unavailable');const metadata=item.metadata.get(data.metadataId);if(!metadata)throw Error('Invalid character metadata');const files=await item.stream.loadTextures(metadata),entries=await Promise.all([...files].map(async([path,bytes])=>[path,await prepareNativeBc7Data(bytes)]));if(sessions.get(session)!==item)return;self.postMessage({id,session,result:entries},entries.map(([,texture])=>texture.buffer));return;}
  if(kind==='bitmaps'){
   if(item.stream.variant!=='webp'||typeof createImageBitmap!=='function')throw Error('Character bitmap decoding unavailable');const metadata=item.metadata.get(data.metadataId);if(!metadata)throw Error('Invalid character metadata');const files=await item.stream.loadTextures(metadata),created=[];
   const results=await Promise.allSettled([...files].map(async([path,bytes])=>{const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/webp'}),{premultiplyAlpha:'none',colorSpaceConversion:'none'});created.push(bitmap);return [path,bitmap];}));
   const failure=results.find(result=>result.status==='rejected');if(failure||sessions.get(session)!==item){for(const bitmap of created)bitmap.close();if(failure)throw failure.reason;return;}
   try{const entries=results.map(result=>result.value);self.postMessage({id,session,kind:'bitmaps',result:entries},entries.map(([,bitmap])=>bitmap));}catch(error){for(const bitmap of created)bitmap.close();throw error;}return;
  }
  throw Error('Unknown character data request');
 }catch(error){if(sessions.has(session)||kind==='open')self.postMessage({id,session,error:{name:error?.name??'Error',message:String(error?.message??error)}});}
};

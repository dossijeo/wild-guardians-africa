import manifest from '../../content/manifests/wall-buffer-package.json' with {type:'json'};
import {bytes} from './asset-fetch.js';
const key=url=>{try{return new URL(url,'http://localhost').pathname;}catch{return null;}};
// Experimental only. Exact aligned lane views share one immutable buffer;
// geometry ownership and morph correspondence remain unchanged. No fallback.
export async function wallBufferReader(pack,{signal,assertOpen,load=bytes}={}){
 const selected=new Map();
 for(const piece of Object.values(pack.pieces)){
  const rows=[...['p','n','uv'].map(field=>[piece[field],'f32']),...['i','faceRegions'].map(field=>[piece[field],'u16']),...Object.values(piece.morph).flatMap(bridge=>[[bridge.p,'f32'],[bridge.n,'f32']])];
  for(const [desc,type] of rows){
   const url=key(desc.url),entry=manifest.entries.find(e=>e.url===url);
   if(desc.encoding!=='external-binary'||!entry||entry.type!==type)throw Error('Unknown packed wall buffer or lane type '+url);selected.set(url,entry);
  }
 }
 if(signal?.aborted)throw Error('Wall buffer package cancelled');assertOpen?.();
 const buffer=await load(manifest.url,{signal});
 if(signal?.aborted)throw Error('Wall buffer package cancelled');assertOpen?.();
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==manifest.byteLength)throw Error('Invalid wall buffer package length');
 for(const entry of selected.values())if(!Number.isSafeInteger(entry.offset)||entry.offset%4||!Number.isSafeInteger(entry.length)||entry.length<0||entry.offset+entry.length>buffer.byteLength)throw Error('Invalid packed wall range');
 return async url=>{
  if(signal?.aborted)throw Error('Wall buffer package cancelled');assertOpen?.();
  const entry=selected.get(key(url));if(!entry)throw Error('Unselected wall buffer');
  return new Uint8Array(buffer,entry.offset,entry.length);
 };
}
export const wallBufferPackageEnabled=(scope=globalThis)=>{
 const selected=scope.__desktopSmokeStarted===true&&scope.__desktopSmokeWallBufferPackage===true;
 if(selected&&import.meta.env?.PROD===true)throw Error('Wall buffer package is an archived source/dev diagnostic, unavailable in published packages');
 return selected;
};

import {CompressedTexture,RGBA_BPTC_Format,UnsignedByteType} from 'three';

// GLTFLoader retains sampler assignment and texture associations. The native
// BC7 mip bytes were verified and parsed by the auxiliary worker.
export function createPreparsedBc7Loader(manager,fallback){
 if(typeof manager?.itemStart!=='function'||typeof fallback?.load!=='function')throw TypeError('Invalid BC7 loader');
 const entries=new Map();let next=0,closed=false;
 const loader={load(url,onLoad,onProgress,onError){const data=entries.get(url);if(!data)return fallback.load(url,onLoad,onProgress,onError);manager.itemStart(url);queueMicrotask(()=>{try{if(closed)throw Error('Prepared BC7 loader closed');const mipmaps=data.mipmaps.map(level=>({data:new Uint8Array(data.buffer,level.offset,level.length),width:level.width,height:level.height,depth:0})),texture=new CompressedTexture(mipmaps,data.width,data.height,data.format,data.type);texture.colorSpace=data.colorSpace;texture.minFilter=data.minFilter;texture.magFilter=data.magFilter;texture.generateMipmaps=data.generateMipmaps;texture.needsUpdate=true;onLoad(texture);}catch(error){manager.itemError(url);onError?.(error);}finally{manager.itemEnd(url);}});}};
 return {loader,add(data){if(closed||!(data?.buffer instanceof ArrayBuffer)||data.format!==RGBA_BPTC_Format||data.type!==UnsignedByteType||!Number.isSafeInteger(data.width)||data.width<1||!Number.isSafeInteger(data.height)||data.height<1||!Array.isArray(data.mipmaps)||!data.mipmaps.length||data.mipmaps.some(level=>![level.offset,level.length,level.width,level.height].every(Number.isSafeInteger)||level.offset<0||level.length<1||level.width<1||level.height<1||level.offset+level.length>data.buffer.byteLength))throw TypeError('Invalid prepared BC7 texture');const uri=`data:application/x-wg-bc7,${next++}`;entries.set(uri,data);return uri;},dispose(){closed=true;entries.clear();}};
}

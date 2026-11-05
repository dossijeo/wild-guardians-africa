// Approximate retained CPU/GPU bytes. Unknown image or buffer layouts are not
// retained: the estimate is a budget heuristic, not a driver memory query.
export function estimateIdleAssetBytes(asset){
 if(!asset?.scene?.isObject3D)return Infinity;
 const buffers=new Set(),textures=new Set(),materials=new Set();let bytes=0,unknown=false;
 function buffer(array){if(!array)return;const storage=array.buffer;if(!(storage instanceof ArrayBuffer)&&!(typeof SharedArrayBuffer!=='undefined'&&storage instanceof SharedArrayBuffer)){unknown=true;return;}if(buffers.has(storage))return;buffers.add(storage);bytes+=storage.byteLength*2;}
 function texture(value){if(!value?.isTexture||textures.has(value))return;textures.add(value);if(value.mipmaps?.length){for(const mip of value.mipmaps){if(!mip?.data?.buffer){unknown=true;continue;}buffer(mip.data);}return;}const data=value.source?.data??value.image;if(data?.data?.buffer){buffer(data.data);return;}if(Number.isFinite(data?.width)&&Number.isFinite(data?.height)&&data.width>0&&data.height>0){bytes+=Math.ceil(data.width*data.height*4*8/3);return;}unknown=true;}
 asset.scene.traverse(node=>{const geometry=node.geometry;if(geometry){for(const attr of Object.values(geometry.attributes??{}))buffer(attr.array??attr.data?.array);buffer(geometry.index?.array);for(const group of Object.values(geometry.morphAttributes??{}))for(const attr of group)buffer(attr.array??attr.data?.array);}for(const material of (Array.isArray(node.material)?node.material:[node.material])){if(!material||materials.has(material))continue;materials.add(material);for(const value of Object.values(material))texture(value);}});
 for(const clip of asset.clips??[])for(const track of clip.tracks??[]){buffer(track.times);buffer(track.values);}
 return unknown||!Number.isSafeInteger(bytes)||bytes<=0?Infinity:bytes;
}

export function createSharedIdleAssetBudget(maxBytes){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<0)throw TypeError('Invalid idle asset budget');
 const idle=new Map();let bytes=0;
 function take(record){if(!record||!idle.delete(record))return false;record.owner.records.delete(record.key);record.owner.bytes-=record.size;bytes-=record.size;return true;}
 return {
  createOwner(onEvict){
   if(typeof onEvict!=='function')throw TypeError('Invalid idle asset owner');
   const owner={records:new Map(),bytes:0,onEvict};
   return {
    take(key){return take(owner.records.get(key));},
    retain(key,size){
     take(owner.records.get(key));
     if(!Number.isSafeInteger(size)||size<=0||size>maxBytes){onEvict(key);return false;}
     const record={owner,key,size};owner.records.set(key,record);owner.bytes+=size;idle.set(record,true);bytes+=size;
     while(bytes>maxBytes){const oldest=idle.keys().next().value;take(oldest);oldest.owner.onEvict(oldest.key);}
     return idle.has(record);
    },
    clear(){for(const record of [...owner.records.values()]){take(record);onEvict(record.key);}},
    status(){return {idle:owner.records.size,estimatedBytes:owner.bytes,maxBytes};},
   };
  },
  status(){return {idle:idle.size,estimatedBytes:bytes,maxBytes};},
 };
}

export function createIdleAssetBudget(maxBytes,onEvict){return createSharedIdleAssetBudget(maxBytes).createOwner(onEvict);}

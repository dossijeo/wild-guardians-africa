// Approximation only: object headers and shared backing stores vary between
// engines. Count all reachable payloads without serializing or copying them.
export function estimateRetainedBytes(value,seen=new WeakSet()){
 if(typeof value==='string')return value.length*2;
 if(value===null||typeof value!=='object')return 8;
 if(seen.has(value))return 0;seen.add(value);
 if(value instanceof ArrayBuffer||typeof SharedArrayBuffer!=='undefined'&&value instanceof SharedArrayBuffer)return value.byteLength;
 if(ArrayBuffer.isView(value))return value.byteLength;
 if(value instanceof Map){let size=32;for(const [key,item] of value)size+=estimateRetainedBytes(key,seen)+estimateRetainedBytes(item,seen)+16;return size;}
 if(value instanceof Set){let size=32;for(const item of value)size+=estimateRetainedBytes(item,seen)+8;return size;}
 let size=Array.isArray(value)?value.length*8:32;
 for(const [key,item] of Object.entries(value))size+=key.length*2+estimateRetainedBytes(item,seen);
 return size;
}

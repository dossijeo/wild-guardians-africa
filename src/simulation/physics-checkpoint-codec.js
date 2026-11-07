// Experimental JSON envelope for a Worker physics checkpoint. This codec does
// not make the checkpoint a validated or supported game save by itself.
const MAX_BYTES=16*1024*1024,TAG='__wildPhysicsValue';
function bytesToBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
function base64ToBytes(text){if(typeof text!=='string'||text.length>Math.ceil(MAX_BYTES*4/3)+4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw Error('Invalid checkpoint bytes');let raw;try{raw=atob(text);}catch{throw Error('Invalid checkpoint bytes');}if(raw.length>MAX_BYTES)throw Error('Checkpoint bytes too large');return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export function encodePhysicsCheckpoint(checkpoint){
 if(!checkpoint||checkpoint.version!==1||!checkpoint.fall)throw Error('Invalid physics checkpoint');
 const text=JSON.stringify(checkpoint,(_key,value)=>{if(value instanceof Uint8Array){if(value.length>MAX_BYTES)throw Error('Checkpoint bytes too large');return {[TAG]:'bytes',value:bytesToBase64(value)};}if(typeof value==='number'&&!Number.isFinite(value)){if(Number.isNaN(value))throw Error('Invalid checkpoint number');return {[TAG]:value>0?'infinity':'-infinity'};}if(Object.is(value,-0))return {[TAG]:'negative-zero'};return value;});
 if(text.length>MAX_BYTES*2)throw Error('Checkpoint too large');return text;
}
export function decodePhysicsCheckpoint(text){
 if(typeof text!=='string'||text.length>MAX_BYTES*2)throw Error('Invalid physics checkpoint encoding');
 const value=JSON.parse(text,(_key,item)=>{if(!item||typeof item!=='object'||Array.isArray(item)||!Object.hasOwn(item,TAG))return item;const keys=Object.keys(item),kind=item[TAG];if(kind==='bytes'&&keys.length===2&&Object.hasOwn(item,'value'))return base64ToBytes(item.value);if(keys.length===1&&kind==='infinity')return Infinity;if(keys.length===1&&kind==='-infinity')return -Infinity;if(keys.length===1&&kind==='negative-zero')return -0;throw Error('Invalid checkpoint value');});
 if(!value||value.version!==1||!value.fall||!(value.fall.solver?.world instanceof Uint8Array))throw Error('Invalid physics checkpoint');return value;
}

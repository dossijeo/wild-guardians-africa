import {createHash} from 'node:crypto';
// Offline candidate: descriptors retain their original URL and gain a range.
// Runtime adoption must explicitly consume ranges; never silently rewrite URLs.
export function packWallBuffers(pack,read){
 const copies=new Map(),ranges=[];let length=0;
 function visit(value){if(!value||typeof value!=='object')return;if(typeof value.url==='string'&&/\.bin$/.test(value.url)){if(!copies.has(value.url)){const bytes=Buffer.from(read(value.url));length=Math.ceil(length/4)*4;copies.set(value.url,{offset:length,bytes});ranges.push({url:value.url,offset:length,byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});length+=bytes.length;}}for(const child of Object.values(value))if(child&&typeof child==='object')visit(child);}
 visit(pack.pieces);const binary=Buffer.alloc(Math.ceil(length/4)*4);for(const {offset,bytes}of copies.values())bytes.copy(binary,offset);
 return {binary,ranges};
}

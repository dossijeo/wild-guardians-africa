// Build-time only. Share exact embedded image bytes without changing accessor data.
import {createHash} from 'node:crypto';
export function shareGlbImages(inputs,uriFor){
 const parse=bytes=>{if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw Error('Expected GLB2');const n=bytes.readUInt32LE(12);if(bytes.readUInt32LE(16)!==0x4e4f534a||bytes.readUInt32LE(24+n)!==0x004e4942)throw Error('Expected JSON/BIN');return {json:JSON.parse(bytes.subarray(20,20+n)),bin:bytes.subarray(28+n,28+n+bytes.readUInt32LE(20+n))};};
 const entries=inputs.map(({name,bytes})=>({name,bytes,...parse(bytes)})),groups=new Map();
 for(const entry of entries)for(const image of entry.json.images??[]){if(image.bufferView===undefined)continue;const v=entry.json.bufferViews[image.bufferView];if(v.buffer!==0)continue;const bytes=entry.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);if(bytes.length!==v.byteLength)throw Error('Truncated image');const hash=createHash('sha256').update(bytes).digest('hex');let g=groups.get(hash);if(!g){g={bytes,uses:[]};groups.set(hash,g);}g.uses.push({entry,image,view:v});}
 const selected=[...groups.values()].filter(g=>g.uses.length>1);let size=0;const chunks=[];
 for(const g of selected){size=(size+3)&~3;g.offset=size;chunks.push({offset:size,bytes:g.bytes});size+=g.bytes.length;}
 size=(size+3)&~3;const shared=Buffer.alloc(size);for(const c of chunks)c.bytes.copy(shared,c.offset);
 const changed=new Map();
 for(const g of selected)for(const use of g.uses){let list=changed.get(use.entry);if(!list){list=[];changed.set(use.entry,list);}list.push({...use,group:g});}
 const outputs=[];
 for(const [entry,uses] of changed){
  const {json,bin}=entry,index=json.buffers.length;
  const ranges=[...new Map(uses.map(u=>[u.view.byteOffset??0,{start:u.view.byteOffset??0,end:((u.view.byteOffset??0)+u.view.byteLength+3)&~3}])).values()].sort((a,b)=>a.start-b.start);
  for(let i=0;i<ranges.length;i++)if(ranges[i].end>bin.length||(i&&ranges[i].start<ranges[i-1].end))throw Error('Overlapping image ranges');
  const imageViews=new Set(uses.map(u=>u.view));
  const remap=(offset,length)=>{if(ranges.some(r=>offset<r.end&&offset+length>r.start))throw Error('Shared image overlaps non-image payload');return offset-ranges.filter(r=>r.end<=offset).reduce((n,r)=>n+r.end-r.start,0);};
  for(const v of json.bufferViews??[]){if(!imageViews.has(v)&&v.buffer===0)v.byteOffset=remap(v.byteOffset??0,v.byteLength);const compressed=v.extensions?.EXT_meshopt_compression;if(compressed?.buffer===0)compressed.byteOffset=remap(compressed.byteOffset??0,compressed.byteLength);}
  for(const u of uses){u.view.buffer=index;u.view.byteOffset=u.group.offset;}
  const parts=[];let cursor=0;for(const r of ranges){parts.push(bin.subarray(cursor,r.start));cursor=r.end;}parts.push(bin.subarray(cursor));const packed=Buffer.concat(parts);
  json.buffers[0].byteLength=packed.length;json.buffers.push({uri:uriFor(entry.name),byteLength:shared.length});
  const raw=Buffer.from(JSON.stringify(json)),text=Buffer.alloc((raw.length+3)&~3,0x20);raw.copy(text);const out=Buffer.alloc(28+text.length+packed.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(text.length,12);out.writeUInt32LE(0x4e4f534a,16);text.copy(out,20);out.writeUInt32LE(packed.length,20+text.length);out.writeUInt32LE(0x004e4942,24+text.length);packed.copy(out,28+text.length);outputs.push({name:entry.name,bytes:out});
 }
 return {shared,outputs,groups:selected.length,savedBytes:outputs.reduce((n,o)=>n+inputs.find(i=>i.name===o.name).bytes.length-o.bytes.length,0)-shared.length};
}

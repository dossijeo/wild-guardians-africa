// Complete native validation precedes this transport. It changes only message
// granularity, never save data or validation. JSON snapshots have plain objects.
export function snapshotStream(state,{threshold=1024}={}){
 const batchSize=256;
 const arrays=Object.entries(state).filter(([,value])=>Array.isArray(value));
 const keys=Object.keys(state.ledger.entries);
 if(!arrays.some(([,value])=>value.length>threshold)&&keys.length<=threshold)return null;
 const header={...state,ledger:{...state.ledger,entries:{}}},lengths=[];
 for(const [key,value] of arrays){header[key]=[];lengths.push([key,value.length]);}
 function* chunks(){
  for(const [key,value] of arrays){
   for(let offset=0;offset<value.length;offset+=batchSize){
    const items=value.slice(offset,offset+batchSize);
    yield {kind:'array',key,offset,items};
    // ACK means the receiver already owns this data; release Worker references.
    value.fill(null,offset,Math.min(value.length,offset+batchSize));
   }
  }
  for(let offset=0;offset<keys.length;offset+=batchSize){
   const entries=keys.slice(offset,offset+batchSize).map(key=>[key,state.ledger.entries[key]]);
   yield {kind:'ledger',offset,entries};
   for(const [key] of entries)delete state.ledger.entries[key];
  }
 }
 return {header,lengths,entries:keys.length,chunks:chunks()};
}

export class SnapshotAssembly {
 constructor({header,lengths,entries}){
  if(!header||typeof header!=='object'||Array.isArray(header)||!Array.isArray(lengths)||!Number.isSafeInteger(entries)||entries<0)throw Error('Invalid snapshot stream header');
  this.state=header;this.lengths=new Map();this.offsets=new Map();this.entries=entries;this.entryOffset=0;this.sequence=0;
  for(const [key,length] of lengths){
   if(typeof key!=='string'||this.lengths.has(key)||!Number.isSafeInteger(length)||length<0||!Object.hasOwn(header,key)||!Array.isArray(header[key])||header[key].length!==0)throw Error('Invalid snapshot array header');
   this.lengths.set(key,length);this.offsets.set(key,0);header[key].length=length;
  }
  if(!header.ledger?.entries||Array.isArray(header.ledger.entries)||typeof header.ledger.entries!=='object'||Object.keys(header.ledger.entries).length)throw Error('Invalid snapshot ledger header');
 }
 accept({sequence,kind,key,offset,items,entries}){
  if(sequence!==this.sequence)throw Error('Out-of-order snapshot stream');
  if(kind==='ledger'){
   if(offset!==this.entryOffset||!Array.isArray(entries)||!entries.length||entries.length>256||offset+entries.length>this.entries)throw Error('Invalid snapshot ledger chunk');
   for(const pair of entries){
    if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||Object.hasOwn(this.state.ledger.entries,pair[0]))throw Error('Duplicate or invalid snapshot ledger entry');
    Object.defineProperty(this.state.ledger.entries,pair[0],{value:pair[1],enumerable:true,writable:true,configurable:true});
   }
   this.entryOffset+=entries.length;
  }else if(kind==='array'){
   if(!this.lengths.has(key)||offset!==this.offsets.get(key)||!Array.isArray(items)||!items.length||items.length>256||offset+items.length>this.lengths.get(key))throw Error('Invalid snapshot array chunk');
   const target=this.state[key];for(let i=0;i<items.length;i++)target[offset+i]=items[i];this.offsets.set(key,offset+items.length);
  }else throw Error('Invalid snapshot chunk kind');
  this.sequence++;
 }
 complete(sequence){
  if(sequence!==this.sequence||this.entryOffset!==this.entries||[...this.lengths].some(([key,length])=>this.offsets.get(key)!==length))throw Error('Incomplete snapshot stream');
  return this.state;
 }
}

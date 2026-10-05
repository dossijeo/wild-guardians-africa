// Offline Ogg Opus cropping. Audio packets are retained byte-for-byte.
import assert from 'node:assert/strict';
const table=Uint32Array.from({length:256},(_,n)=>{let v=n<<24;for(let i=0;i<8;i++)v=v&0x80000000?(v<<1)^0x04c11db7:v<<1;return v>>>0;});
export function oggChecksum(bytes){let crc=0;for(const b of bytes)crc=((crc<<8)^table[((crc>>>24)^b)&255])>>>0;return crc;}
export function opusPacketSamples(packet){
 assert.ok(packet.length>0,'Empty Opus packet');const config=packet[0]>>>3,code=packet[0]&3;
 const frame=config<12?[480,960,1920,2880][config%4]:config<16?[480,960][config%2]:[120,240,480,960][config%4];
 const count=code===0?1:code===3?(packet[1]??0)&63:2;
 assert.ok(count>0&&count*frame<=5760,'Invalid Opus frame count');return count*frame;
}
export function readOggOpus(bytes){
 const packets=[],packetRanges=[],parts=[],ranges=[];let serial,sequence=0,offset=0,finalGranule=null,ended=false;
 while(offset<bytes.length){
  assert.ok(!ended&&offset+27<=bytes.length,'Truncated or chained Ogg');
  const header=bytes.subarray(offset,offset+27);assert.equal(header.toString('ascii',0,4),'OggS');assert.equal(header[4],0);
  const count=header[26],laces=bytes.subarray(offset+27,offset+27+count);assert.equal(laces.length,count);
  const length=27+count+laces.reduce((sum,n)=>sum+n,0),page=bytes.subarray(offset,offset+length);assert.equal(page.length,length,'Truncated page');
  const copy=Buffer.from(page),checksum=copy.readUInt32LE(22);copy.writeUInt32LE(0,22);assert.equal(oggChecksum(copy),checksum,'Ogg CRC mismatch');
  serial??=header.readUInt32LE(14);assert.equal(header.readUInt32LE(14),serial,'Multiple streams unsupported');assert.equal(header.readUInt32LE(18),sequence++);
  assert.equal(Boolean(header[5]&1),parts.length>0,'Invalid packet continuation');
  if(sequence===1)assert.ok(header[5]&2,'Missing stream beginning');
  let position=27+count;
  for(const n of laces){
   parts.push(page.subarray(position,position+n));
   if(n){const previous=ranges.at(-1),start=offset+position;if(previous&&previous[0]+previous[1]===start)previous[1]+=n;else ranges.push([start,n]);}
   position+=n;if(n<255){packets.push(Buffer.concat(parts));packetRanges.push(ranges.splice(0));parts.length=0;}
  }
  if(header[5]&4){assert.equal(parts.length,0);finalGranule=Number(header.readBigUInt64LE(6));ended=true;}
  offset+=length;
 }
 assert.ok(ended&&Number.isSafeInteger(finalGranule),'Missing Ogg ending');assert.equal(parts.length,0);
 const [head,tags,...audio]=packets;assert.equal(head?.toString('ascii',0,8),'OpusHead');assert.equal(tags?.toString('ascii',0,8),'OpusTags');
 assert.equal(head.length,19,'Only mono/stereo mapping 0 supported');assert.equal(head[18],0);assert.ok([1,2].includes(head[9]));
 const preSkip=head.readUInt16LE(10),samples=audio.map(opusPacketSamples),total=samples.reduce((a,b)=>a+b,0);
 assert.ok(finalGranule<=total&&finalGranule>total-samples.at(-1)&&finalGranule>=preSkip,'Invalid final trimming');
 return {head,tags,audio,audioRanges:packetRanges.slice(2),samples,preSkip,finalGranule,serial,decodedSamples:finalGranule-preSkip};
}
function page(packets,{flags,granule,serial,sequence}){
 const laces=[];for(const packet of packets){let left=packet.length;while(left>=255){laces.push(255);left-=255;}laces.push(left);}
 assert.ok(laces.length<=255,'Too many Ogg segments');const header=Buffer.alloc(27+laces.length);header.write('OggS');header[5]=flags;
 header.writeBigUInt64LE(BigInt(granule),6);header.writeUInt32LE(serial,14);header.writeUInt32LE(sequence,18);header[26]=laces.length;Buffer.from(laces).copy(header,27);
 const result=Buffer.concat([header,...packets]);result.writeUInt32LE(oggChecksum(result),22);return result;
}
export function cropOpusWindow(stream,startSample,endSample,{prerollPackets=30,tailPackets=2,pcmPrerollPackets=2}={}){
 assert.ok(stream.samples.every(n=>n===960),'Experimental windows require 20 ms packets');
 assert.ok(Number.isSafeInteger(startSample)&&Number.isSafeInteger(endSample)&&startSample>=0&&endSample>startSample&&endSample<=stream.decodedSamples);
 assert.ok(Number.isSafeInteger(prerollPackets)&&prerollPackets>=4&&Number.isSafeInteger(tailPackets)&&tailPackets>=0);
 assert.ok(Number.isSafeInteger(pcmPrerollPackets)&&pcmPrerollPackets>=0);
 const firstSample=Math.max(0,startSample-pcmPrerollPackets*960);
 const first=Math.max(0,Math.floor((firstSample+stream.preSkip)/960)-prerollPackets);
 const last=Math.min(stream.audio.length,Math.ceil((endSample+stream.preSkip)/960)+tailPackets);
 const skip=firstSample+stream.preSkip-first*960;assert.ok(skip<=65535);if(first>0)assert.ok(skip>=3840);
 const head=Buffer.from(stream.head);head.writeUInt16LE(skip,10);
 const chunks=[page([head],{flags:2,granule:0,serial:stream.serial,sequence:0}),page([stream.tags],{flags:0,granule:0,serial:stream.serial,sequence:1})];
 let sequence=2;
 for(let i=first;i<last;i+=20){
  let j=Math.min(last,i+20);while(stream.audio.slice(i,j).reduce((n,p)=>n+Math.floor(p.length/255)+1,0)>255)j--;
  assert.ok(j>i);const final=j===last,granule=final?Math.min(stream.finalGranule,last*960)-first*960:(j-first)*960;
  chunks.push(page(stream.audio.slice(i,j),{flags:final?4:0,granule,serial:stream.serial,sequence:sequence++}));
  // Current 128 kbps mono/stereo packets fit 20 per page; reject unusual streams instead of skipping packets.
  assert.equal(j,Math.min(last,i+20),'Experimental packet grouping exceeded a page');
 }
 return {bytes:Buffer.concat(chunks),firstPacket:first,lastPacket:last,preSkip:skip,firstSample,
  decodedSamples:Math.min(stream.finalGranule,last*960)-first*960-skip};
}

// Precompute only new Ogg headers and copy ranges. Runtime need not regenerate CRCs,
// parse packets or carry a second encoded copy of every musical stem.
export function opusWindowRecipe(stream,window){
 const chunks=[];let offset=0,packet=window.firstPacket;
 while(offset<window.bytes.length){
  const count=window.bytes[offset+26],headerLength=27+count,laces=window.bytes.subarray(offset+27,offset+headerLength);
  const size=headerLength+laces.reduce((n,x)=>n+x,0),page=window.bytes.subarray(offset,offset+size);
  if(chunks.length<2)chunks.push({header:page.toString('base64'),ranges:[]});
  else{
   const ranges=[];
   for(const lace of laces)if(lace<255){
    for(const [start,length] of stream.audioRanges[packet++]){const last=ranges.at(-1);if(last&&last[0]+last[1]===start)last[1]+=length;else ranges.push([start,length]);}
   }
   chunks.push({header:page.subarray(0,headerLength).toString('base64'),ranges});
  }
  offset+=size;
 }
 assert.equal(packet,window.lastPacket);
 const ranges=chunks.flatMap(c=>c.ranges),startByte=Math.min(...ranges.map(r=>r[0])),endByte=Math.max(...ranges.map(r=>r[0]+r[1]));
 for(const chunk of chunks)for(const range of chunk.ranges)range[0]-=startByte;
 return {startByte,endByte,recipe:{bytes:window.bytes.length,chunks}};
}

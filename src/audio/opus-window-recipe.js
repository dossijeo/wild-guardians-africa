// Headers/CRCs are prepared offline. Only the requested encoded byte window is copied.
export function assembleOpusWindow(encoded,recipe){
 if(!Number.isSafeInteger(recipe?.bytes)||recipe.bytes<1||recipe.bytes>2097152||!Array.isArray(recipe.chunks)||recipe.chunks.length>128)throw Error('Invalid Opus window recipe');
 const source=new Uint8Array(encoded),output=new Uint8Array(recipe.bytes);let position=0;
 for(const chunk of recipe.chunks){
  if(typeof chunk.header!=='string'||chunk.header.length>8192||!Array.isArray(chunk.ranges))throw Error('Invalid Opus window header');
  const header=atob(chunk.header);if(position+header.length>output.length)throw Error('Opus header exceeds window');
  for(let i=0;i<header.length;i++)output[position++]=header.charCodeAt(i);
  for(const range of chunk.ranges){
   if(!Array.isArray(range)||range.length!==2)throw Error('Invalid Opus copy range');
   const [start,length]=range;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(length)||start<0||length<1||start+length>source.length||position+length>output.length)throw Error('Opus copy range exceeds window');
   output.set(source.subarray(start,start+length),position);position+=length;
  }
 }
 if(position!==output.length)throw Error('Opus window recipe length mismatch');
 return output.buffer;
}

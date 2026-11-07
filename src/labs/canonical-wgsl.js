// Experiment only: Three r180 emits object-specific NodeBuffer_<id> symbols in
// WGSL. Rename those local symbols consistently before Three keys its shaders.
// Bindings use explicit numeric group/binding indices, not WGSL variable names.
export function canonicalizeNodeBufferNames(source){
 if(typeof source!=='string'||/\bNodeBuffer_Q\d+(?:Struct)?\b/.test(source))return source;
 const ids=new Map();
 return source.replace(/\bNodeBuffer_(\d+)(Struct)?\b/g,(_,id,suffix)=>{
  if(!ids.has(id))ids.set(id,ids.size);
  return `NodeBuffer_Q${ids.get(id)}${suffix??''}`;
 });
}

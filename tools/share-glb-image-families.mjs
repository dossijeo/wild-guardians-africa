import {createHash} from 'node:crypto';
import path from 'node:path';
import {shareGlbImages} from './share-glb-images.mjs';
// Exact user sets: every model downloads only images already embedded in itself.
export function shareGlbImageFamilies(inputs){
 const sets=new Map();
 shareGlbImages(inputs,()=>'',g=>{const names=[...new Set(g.uses.map(u=>u.entry.name))].sort(),key=JSON.stringify(names);let family=sets.get(key);if(!family){family={names,hashes:new Set()};sets.set(key,family);}family.hashes.add(g.hash);return false;});
 const current=new Map(inputs.map(i=>[i.name,i])),banks=[];
 for(const family of sets.values()){
  const hash=createHash('sha256').update([...family.hashes].sort().join(':')).digest('hex'),name='assets/shared-images/'+hash+'.bin';
  const result=shareGlbImages(family.names.map(n=>current.get(n)),model=>path.posix.relative(path.posix.dirname(model),name),g=>family.hashes.has(g.hash));
  if(!result.outputs.length)continue;
  for(const output of result.outputs)current.set(output.name,output);
  banks.push({name,bytes:result.shared,models:family.names});
 }
 const outputs=[...current.values()].filter(o=>o!==inputs.find(i=>i.name===o.name));
 return {outputs,banks,savedBytes:outputs.reduce((sum,o)=>sum+inputs.find(i=>i.name===o.name).bytes.length-o.bytes.length,0)-banks.reduce((sum,b)=>sum+b.bytes.length,0)};
}

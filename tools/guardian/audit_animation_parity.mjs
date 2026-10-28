// Compare every source animation channel against an edited GLB, including packed/strided samples.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readGlb} from '../glb-container.mjs';
const [source,candidate,output]=process.argv.slice(2);
if(!source||!candidate||!output)throw Error('Usage: node audit_animation_parity.mjs source.glb candidate.glb report.json');
const load=path=>{const bytes=fs.readFileSync(path);return {...readGlb(bytes),sha:createHash('sha256').update(bytes).digest('hex')};};
const a=load(source),b=load(candidate);
function samples(g,id){
 const x=g.json.accessors[id];assert.ok(!x.sparse,'Sparse animation accessor needs explicit decoding');
 const v=g.json.bufferViews[x.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[x.type];assert.ok(width);assert.equal(x.componentType,5126);
 const stride=v.byteStride??width*4,offset=(v.byteOffset??0)+(x.byteOffset??0),data=Buffer.alloc(x.count*width*4);
 for(let i=0;i<x.count;i++)data.set(g.bin.subarray(offset+i*stride,offset+i*stride+width*4),i*width*4);
 return {type:x.type,count:x.count,data};
}
function channels(g,clip){return clip.channels.map(c=>{const s=clip.samplers[c.sampler];return {target:g.json.nodes[c.target.node].name,path:c.target.path,interpolation:s.interpolation??'LINEAR',input:samples(g,s.input),output:samples(g,s.output)};}).sort((x,y)=>(x.target+':'+x.path).localeCompare(y.target+':'+y.path));}
const clips=[];
for(const clip of a.json.animations??[]){const matches=(b.json.animations??[]).filter(x=>x.name===clip.name);assert.equal(matches.length,1,'Missing or duplicate clip '+clip.name);const original=channels(a,clip),edited=channels(b,matches[0]);assert.deepEqual(edited,original,'Changed channel in '+clip.name);clips.push({name:clip.name,channels:original.length,exactSampleBytes:true});}
assert.ok(clips.length,'Source has no animations');
const report={sourceSha256:a.sha,candidateSha256:b.sha,clips,passed:true,scope:'Original clip samples, interpolation and target node names/paths only; not skinning or visual pose quality'};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({clips:clips.length,passed:true}));

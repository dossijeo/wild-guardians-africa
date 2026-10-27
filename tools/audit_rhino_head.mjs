import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {readGlb} from './glb-container.mjs';
// Reference is the committed foot-only replacement, before the head lift.
const root='docs/qa/rhino-replacement/',before=JSON.parse(await readFile(root+'head-before-audit.json','utf8')),after=JSON.parse(await readFile(root+'animation-audit.json','utf8'));
const old=readGlb(execFileSync('git',['show','392fabde8:public'+before.url],{maxBuffer:150*1024*1024})),next=readGlb(await readFile('public'+after.url));
function view(g,index){const a=g.json.accessors[index],v=g.json.bufferViews[a.bufferView];return Buffer.from(g.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength))}
let attributes=0,indices=0;
assert.equal(old.json.meshes.length,next.json.meshes.length);
for(let m=0;m<old.json.meshes.length;m++){
 assert.equal(old.json.meshes[m].primitives.length,next.json.meshes[m].primitives.length);
 for(let p=0;p<old.json.meshes[m].primitives.length;p++){
  const a=old.json.meshes[m].primitives[p],b=next.json.meshes[m].primitives[p];assert.deepEqual(Object.keys(a.attributes),Object.keys(b.attributes));
  for(const name of Object.keys(a.attributes)){assert(view(old,a.attributes[name]).equals(view(next,b.attributes[name])),name+' changed');attributes++;}
  assert(view(old,a.indices).equals(view(next,b.indices)));indices++;
 }
}
assert.equal(old.json.skins.length,next.json.skins.length);
for(let i=0;i<old.json.skins.length;i++)assert(view(old,old.json.skins[i].inverseBindMatrices).equals(view(next,next.json.skins[i].inverseBindMatrices)));
assert.deepEqual(old.json.materials,next.json.materials);
assert.equal(old.json.images.length,next.json.images.length);
for(let i=0;i<old.json.images.length;i++){
 const v=old.json.bufferViews[old.json.images[i].bufferView],w=next.json.bufferViews[next.json.images[i].bufferView];
 assert(Buffer.from(old.bin.subarray(v.byteOffset,v.byteOffset+v.byteLength)).equals(Buffer.from(next.bin.subarray(w.byteOffset,w.byteOffset+w.byteLength))));
}
let unchangedChannels=0;
for(const animation of old.json.animations){
 const replacement=next.json.animations.find(a=>a.name===animation.name);assert(replacement);
 for(const channel of animation.channels){
  const name=old.json.nodes[channel.target.node].name;if(['Neck','Head','Head_top'].includes(name))continue;
  const other=replacement.channels.find(c=>next.json.nodes[c.target.node].name===name&&c.target.path===channel.target.path);assert(other);
  const a=animation.samplers[channel.sampler],b=replacement.samplers[other.sampler];
  assert(view(old,a.input).equals(view(next,b.input)),name+' timing changed');assert(view(old,a.output).equals(view(next,b.output)),name+' animation changed');unchangedChannels++;
 }
}
for(let i=0;i<before.clips.length;i++)for(const key of ['duration','minGround','maxRaisedFoot','maxSupportClearance','maxSoleSpread'])assert.equal(before.clips[i][key],after.clips[i][key],key+' foot regression');
const report={beforeRef:'392fabde8',beforeModel:before.url,model:after.url,geometry:'Byte-identical attributes, indices and inverse bind matrices',unchangedNonHeadAnimationChannels:unchangedChannels,attributeBuffersChecked:attributes,indexBuffersChecked:indices,materialsAndImages:'Unchanged',footMetrics:'Identical across all six clips / 774 poses',headLiftDegrees:22,neckLiftDegrees:5,gazeDefinition:'Animated bone delta relative to authored bind orientation; diagnostic forward axis, not eye tracking',locomotion:after.clips.filter(c=>['Walking','Running'].includes(c.name)).map(c=>({name:c.name,beforePitchDegrees:before.clips.find(b=>b.name===c.name).gazePitchDegrees,afterPitchDegrees:c.gazePitchDegrees})),profile:'head-profile.jpg'};
await writeFile(root+'head-posture-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

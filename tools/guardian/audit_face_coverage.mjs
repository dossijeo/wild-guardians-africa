import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
const catalog=JSON.parse(fs.readFileSync('public/content/models.json','utf8'));
const workerSources={olderMale:'Ganadero_Mayor',olderFemale:'Amara_Mayor',youngMale:'Kofi_Joven',youngFemale:'Amara_Joven'};
const actors=[...Object.entries(ANIMAL_ACTIONS.animals).map(([id,data])=>({id,kind:'animal',descriptor:catalog.find(m=>m.source===data.source)})),...Object.entries(workerSources).map(([id,source])=>({id,kind:'worker',descriptor:catalog.find(m=>m.source.includes(source))}))];
const required=['blinkL','blinkR','mouthOpen'];
function inspect(file){
 const bytes=fs.readFileSync(file);if(bytes.toString('ascii',0,4)!=='glTF')throw Error('Not a GLB: '+file);
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),channels=new Set();
 for(const mesh of gltf.meshes??[])for(const [index,name] of (mesh.extras?.targetNames??[]).entries())if(mesh.primitives.some(p=>p.targets?.[index]?.POSITION!==undefined))channels.add(name);
 return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,channels:[...channels].sort(),missing:required.filter(name=>!channels.has(name))};
}
const report={scope:'Active catalog facial-channel availability only. Does not prove nonzero deformation, visual quality or behavior.',actors:actors.map(({id,kind,descriptor})=>{if(!descriptor)throw Error('Missing catalog actor '+id);return {id,kind,source:descriptor.source,...inspect(path.join('public',descriptor.url.replace(/^\//,'')))};}),candidates:[]};
for(const id of ['hyena','lion','warthog','buffalo']){const file=`content/source/actors/${id}/expressive-candidate.glb`;if(fs.existsSync(file)){const candidate=inspect(file);report.candidates.push({id,matchesActiveBytes:report.actors.some(a=>a.id===id&&a.sha256===candidate.sha256),...candidate});}}
report.complete=report.actors.every(a=>!a.missing.length);
const output=process.argv[2];if(!output)throw Error('Usage: node tools/guardian/audit_face_coverage.mjs report.json [--require-all]');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,ready:report.actors.filter(a=>!a.missing.length).map(a=>a.id),missing:report.actors.filter(a=>a.missing.length).map(a=>a.id)}));
if(process.argv.includes('--require-all')&&!report.complete)process.exitCode=2;

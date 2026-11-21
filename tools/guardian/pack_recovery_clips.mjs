import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const destination='public/content/guardian/recovery';
const chunks=[],clips=[];let offset=0;
function append(values){const bytes=Buffer.alloc(values.length*4);values.forEach((value,i)=>bytes.writeFloatLE(value,i*4));const span={offset,length:values.length};chunks.push(bytes);offset+=bytes.length;return span;}
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const source=fs.readFileSync(`content/source/animations/stand-up/${species}-candidate.json`),data=JSON.parse(source),clip=data.clip;
 const times=append(clip.tracks[0].times);
 const tracks=clip.tracks.map(track=>{if(JSON.stringify(track.times)!==JSON.stringify(clip.tracks[0].times))throw Error('Recovery channels require shared sample times');return {name:track.name,type:track.type,values:append(track.values)};});
 clips.push({species,name:clip.name,duration:clip.duration,times,tracks,sourceSha256:data.sourceSha256,targetSha256:data.targetSha256,candidateSha256:crypto.createHash('sha256').update(source).digest('hex')});
}
const bytes=Buffer.concat(chunks);fs.mkdirSync(destination,{recursive:true});fs.writeFileSync(path.join(destination,'recovery.bin'),bytes);fs.writeFileSync(path.join(destination,'recovery.json'),JSON.stringify({schema:'wg-recovery/1',byteLength:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),clips},null,2)+'\n');console.log({bytes:bytes.length,clips:clips.length});

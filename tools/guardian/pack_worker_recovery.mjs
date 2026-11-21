import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='public/content/guardian/worker-recovery',chunks=[],clips=[],profiles={};let offset=0;
function append(values){const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));const span={offset,length:values.length};offset+=b.length;chunks.push(b);return span;}
for(const profile of ['youngMale','olderMale','olderFemale','youngFemale']){
 const source=fs.readFileSync(`content/source/animations/stand-up/workers/${profile}-transition.json`),data=JSON.parse(source),c=data.clip;
 const times=append(c.tracks[0].times),tracks=c.tracks.map(t=>{if(JSON.stringify(t.times)!==JSON.stringify(c.tracks[0].times))throw Error('Unequal sample times');return {name:t.name,type:t.type,values:append(t.values)};});
 clips.push({species:profile,name:c.name,duration:c.duration,times,tracks,targetSha256:data.targetSha256,sourceSha256:data.sourceSha256});
 profiles[profile]={duration:c.duration,finalOffset:data.finalOffset,targetSha256:data.targetSha256};
}
const bytes=Buffer.concat(chunks);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/recovery.bin',bytes);fs.writeFileSync(dir+'/recovery.json',JSON.stringify({schema:'wg-recovery/1',byteLength:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),clips},null,2)+'\n');
fs.writeFileSync('content/manifests/worker-recovery.json',JSON.stringify({version:1,profiles},null,2)+'\n');console.log({bytes:bytes.length,profiles});

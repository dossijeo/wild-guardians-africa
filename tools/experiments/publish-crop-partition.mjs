// Diagnostic publication only. Originals and normal asset aliases stay intact.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {partitionCropLibrary} from './partition-crop-library.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function publishCropPartition(){
 const source=path.join(root,'.cache/maize-partition-publication'),offline=partitionCropLibrary(source);
 const manifest={version:offline.version,sourceRecipeVersion:offline.sourceRecipeVersion,
  partitions:offline.partitions.map(({group,kind,file,bytes,sha256})=>({group,kind,file,bytes,sha256})),
  textures:offline.textures.map(({index,uri,bytes,sha256})=>({index,uri,bytes,sha256}))};
 const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n'),digest=sha(bytes),directory='assets/crop-partition-v1-'+digest.slice(0,20),target=path.join(root,'public',directory);
 const write=(file,data)=>{const dest=path.join(target,file);if(fs.existsSync(dest))assert.equal(sha(fs.readFileSync(dest)),sha(data),'Immutable publication changed: '+file);else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);}};
 write('partition-manifest.json',bytes);
 for(const record of [...manifest.partitions,...manifest.textures]){const file=record.file??record.uri,data=fs.readFileSync(path.join(source,file));assert.equal(data.length,record.bytes);assert.equal(sha(data),record.sha256);write(file,data);}
 const descriptor={version:1,manifest:'/'+directory+'/partition-manifest.json',manifestBytes:bytes.length,manifestSha256:digest};
 const descriptorPath=path.join(root,'content/manifests/crop-partition-runtime.json'),descriptorBytes=Buffer.from(JSON.stringify(descriptor,null,2)+'\n');
 if(!fs.existsSync(descriptorPath)||!fs.readFileSync(descriptorPath).equals(descriptorBytes))fs.writeFileSync(descriptorPath,descriptorBytes);
 return {descriptor,manifest,totalBytes:bytes.length+[...manifest.partitions,...manifest.textures].reduce((sum,item)=>sum+item.bytes,0)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(publishCropPartition().descriptor));

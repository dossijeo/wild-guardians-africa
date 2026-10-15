// Consolidate exact campaign progress logs so large QA runs remain reviewable.
import {readdirSync,readFileSync,writeFileSync,unlinkSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function archiveProgress(directory){
 const dir=resolve(directory),names=readdirSync(dir).filter(n=>n.endsWith('.jsonl')).sort();
 if(!names.length)return {count:0,archive:null};
 const entries=names.map(name=>{
  const bytes=readFileSync(join(dir,name));
  return {name,bytes:bytes.length,sha256:sha(bytes),base64:bytes.toString('base64')};
 });
 const payload=Buffer.from(JSON.stringify({format:'ga-progress-bundle-v1',entries})+'\n');
 const compressed=gzipSync(payload,{level:9,mtime:0});
 const output=join(dir,'progress-bundle.json.gz');
 if(existsSync(output))throw Error('Progress archive already exists');
 writeFileSync(output,compressed);
 const checked=JSON.parse(gunzipSync(readFileSync(output)));
 if(checked.entries.length!==entries.length||checked.entries.some((e,i)=>
  e.name!==entries[i].name||sha(Buffer.from(e.base64,'base64'))!==e.sha256||
  !Buffer.from(e.base64,'base64').equals(readFileSync(join(dir,e.name)))))
  throw Error('Progress archive failed verification');
 for(const name of names)unlinkSync(join(dir,name));
 return {count:names.length,archive:'progress-bundle.json.gz',bytes:compressed.length,sha256:sha(compressed)};
}
export function restoreProgress(archive,destination){
 const data=JSON.parse(gunzipSync(readFileSync(resolve(archive))));
 if(data.format!=='ga-progress-bundle-v1')throw Error('Unsupported progress archive');
 mkdirSync(resolve(destination),{recursive:true});
 for(const entry of data.entries){
  if(!/^[^\\/]+\.jsonl$/.test(entry.name))throw Error('Unsafe progress filename');
  const bytes=Buffer.from(entry.base64,'base64');
  if(bytes.length!==entry.bytes||sha(bytes)!==entry.sha256)throw Error(`Corrupt progress log: ${entry.name}`);
  writeFileSync(join(resolve(destination),entry.name),bytes);
 }
 return data.entries.length;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/archive-progress.mjs')){
 if(!process.argv[2])throw Error('Usage: node archive-progress.mjs <directory> [restore-directory]');
 console.log(JSON.stringify(process.argv[3]?{
  restored:restoreProgress(join(resolve(process.argv[2]),'progress-bundle.json.gz'),process.argv[3])}:
  archiveProgress(process.argv[2])));
}

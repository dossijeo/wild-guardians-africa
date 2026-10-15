// Lossless packing of small historical native reports for reviewable QA diffs.
import {readdirSync,readFileSync,writeFileSync,unlinkSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const safe=name=>/^[a-zA-Z0-9._-]+\.json\.gz$/.test(name)&&
 name!=='reports-bundle.json.gz'&&name!=='progress-bundle.json.gz';
export function archiveNativeReports(directory){
 const dir=resolve(directory),names=readdirSync(dir).filter(safe).sort();
 if(!names.length)return {count:0,archive:null};
 const archive=join(dir,'reports-bundle.json.gz');
 if(existsSync(archive))throw Error('Report bundle already exists');
 const entries=names.map(name=>{
  const bytes=readFileSync(join(dir,name));
  // Verify that each input really is a decodable native report before packing.
  JSON.parse(gunzipSync(bytes));
  return {name,bytes:bytes.length,sha256:sha(bytes),base64:bytes.toString('base64')};
 });
 const payload=Buffer.from(JSON.stringify({format:'ga-native-report-bundle-v1',entries})+'\n');
 writeFileSync(archive,gzipSync(payload,{level:9,mtime:0}));
 const checked=JSON.parse(gunzipSync(readFileSync(archive)));
 if(checked.entries.length!==entries.length||checked.entries.some((entry,index)=>
  entry.name!==entries[index].name||entry.bytes!==entries[index].bytes||
  sha(Buffer.from(entry.base64,'base64'))!==entry.sha256||
  !Buffer.from(entry.base64,'base64').equals(readFileSync(join(dir,entry.name)))))
  throw Error('Report bundle failed byte-for-byte verification');
 for(const name of names)unlinkSync(join(dir,name));
 return {count:names.length,archive:'reports-bundle.json.gz',bytes:readFileSync(archive).length,sha256:sha(readFileSync(archive))};
}
export function restoreNativeReports(archive,destination){
 const data=JSON.parse(gunzipSync(readFileSync(resolve(archive))));
 if(data.format!=='ga-native-report-bundle-v1')throw Error('Unsupported report bundle');
 const dir=resolve(destination);mkdirSync(dir,{recursive:true});
 for(const entry of data.entries){
  if(!safe(entry.name))throw Error('Unsafe report filename');
  const bytes=Buffer.from(entry.base64,'base64');
  if(bytes.length!==entry.bytes||sha(bytes)!==entry.sha256)throw Error(`Corrupt report ${entry.name}`);
  JSON.parse(gunzipSync(bytes));
  writeFileSync(join(dir,entry.name),bytes);
 }
 return data.entries.length;
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/archive-native-reports.mjs')){
 const directory=process.argv[2];if(!directory)throw Error('Expected report directory');
 console.log(JSON.stringify(process.argv[3]?
  {restored:restoreNativeReports(join(resolve(directory),'reports-bundle.json.gz'),process.argv[3])}:
  archiveNativeReports(directory)));
}

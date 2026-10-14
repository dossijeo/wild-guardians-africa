// Keep raw campaign evidence without overwhelming the review diff.
import {readdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function archiveGaReports(directory){
 const dir=resolve(directory),index=[];
 for(const name of readdirSync(dir).filter(n=>/^[a-f0-9]{12}-.+-\d+-\d+\.json$/.test(n)).sort()){
  const source=join(dir,name),raw=readFileSync(source),gz=gzipSync(raw,{level:9});
  if(!gunzipSync(gz).equals(raw))throw Error(`Archive verification failed: ${name}`);
  const archive=`${name}.gz`;
  writeFileSync(join(dir,archive),gz);
  if(!gunzipSync(readFileSync(join(dir,archive))).equals(raw))
   throw Error(`Written archive verification failed: ${name}`);
  index.push({source:name,archive,sourceBytes:raw.length,archiveBytes:gz.length,
   sourceSha256:sha256(raw),archiveSha256:sha256(gz)});
  unlinkSync(source);
 }
 writeFileSync(join(dir,'archive-index.json'),JSON.stringify({format:'ga-native-report-v1',reports:index},null,2)+'\n');
 return index;
}
if(process.argv[1]&&process.argv[1].replaceAll('\\','/').endsWith('/archive-ga-reports.mjs')){
 if(!process.argv[2])throw Error('Usage: node archive-ga-reports.mjs <results-directory>');
 console.log(JSON.stringify(archiveGaReports(process.argv[2])));
}

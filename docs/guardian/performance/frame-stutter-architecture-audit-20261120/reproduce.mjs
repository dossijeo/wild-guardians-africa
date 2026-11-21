import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {analyzeNativeFrameCadence} from '../../../../tools/guardian/analyze_native_frame_cadence.mjs';
import {summarizePreparationCosts} from '../../../../tools/guardian/native-audit-preparation-costs.mjs';
const dir=fileURLToPath(new URL('.',import.meta.url));
const read=name=>{const bytes=fs.readFileSync(dir+name);return name.endsWith('.gz')?gunzipSync(bytes):bytes;};
for(const entry of JSON.parse(read('artifacts.json'))){
 const bytes=read(entry.file);
 if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Evidence mismatch: '+entry.file);
}
for(const entry of JSON.parse(read('tested-sources.json'))){
 if(createHash('sha256').update(read(entry.file)).digest('hex')!==entry.sha256)throw Error('Tested source mismatch: '+entry.path);
}
const failed=JSON.parse(read('live-phases.failure.json.gz'));
fs.writeFileSync(dir+'preparation-analysis.json',JSON.stringify(summarizePreparationCosts(failed),null,2)+'\n');
if(process.argv.includes('--traces'))for(const name of ['live-a','live-phases']){
 const receipt=name==='live-a'?JSON.parse(read('live-a.json.gz')):failed;
 const report=analyzeNativeFrameCadence({...receipt,result:receipt.result??receipt.failure},JSON.parse(read(name+'.trace.json.gz')));
 report.runOutcome=receipt.error?'failed':'passed-original-run';report.error=receipt.error??null;
 fs.writeFileSync(dir+name+'-analysis.json',JSON.stringify(report,null,2)+'\n');
}
console.log('Evidence hashes verified; preparation report regenerated. Failed run remains failed.');

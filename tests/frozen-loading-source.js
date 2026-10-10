import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const directory=new URL('./fixtures/frozen-loading-source/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',directory),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function frozenSource(ref,path){
 const rows=manifest.entries.filter(row=>row.ref===ref&&row.path===path);if(rows.length!==1)throw Error('Unknown or ambiguous frozen source '+ref+':'+path);const row=rows[0];
 if(!/^[a-zA-Z0-9_.-]+$/.test(row.file)||row.bytes>1048576||!Number.isInteger(row.bytes))throw Error('Invalid frozen source bounds');
 const packed=readFileSync(new URL(row.file,directory));if(packed.length!==row.gzipBytes||digest(packed)!==row.gzipSha256)throw Error('Frozen source gzip mismatch');
 const raw=gunzipSync(packed,{maxOutputLength:1048576});if(raw.length!==row.bytes||digest(raw)!==row.sha256)throw Error('Frozen source bytes mismatch');return raw.toString('utf8');
}

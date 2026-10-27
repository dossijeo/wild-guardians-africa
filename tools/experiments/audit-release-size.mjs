import {readFileSync,readdirSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,extname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(process.argv[2]??'dist');
const output=resolve(process.argv[3]??'docs/qa/production-integration-20261025/package-size-baseline.json');
const files=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())walk(path);else files.push({path:relative(root,path).replaceAll('\\','/'),bytes:statSync(path).size,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});}}
walk(root);
const groups={};const hashes=new Map();
for(const file of files){const group=file.path.startsWith('assets/')?file.path.split('/').slice(0,-1).join('/')+'/*'+extname(file.path):file.path.split('/')[0];const item=groups[group]??={files:0,bytes:0};item.files++;item.bytes+=file.bytes;const same=hashes.get(file.sha256)??[];same.push(file);hashes.set(file.sha256,same);}
const report={root,files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0),itchLimits:{files:1000,bytes:500000000},groups:Object.entries(groups).map(([path,data])=>({path,...data})).sort((a,b)=>b.bytes-a.bytes),largest:[...files].sort((a,b)=>b.bytes-a.bytes).slice(0,50),duplicateBytes:[...hashes.values()].filter(a=>a.length>1).map(a=>({bytes:a[0].bytes,redundantBytes:a[0].bytes*(a.length-1),paths:a.map(f=>f.path)})).sort((a,b)=>b.redundantBytes-a.redundantBytes)};
mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({files:report.files,bytes:report.bytes,groups:report.groups.slice(0,12),duplicates:report.duplicateBytes.slice(0,6)},null,2));

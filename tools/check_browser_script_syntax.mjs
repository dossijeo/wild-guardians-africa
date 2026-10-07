import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Parse only; never execute fixtures or resolve imports. Git selects owned,
// tracked QA pages so unrelated in-progress pages are not treated as deliverables.
const paths=process.argv.slice(2);
const files=paths.length?paths:execFileSync('git',['ls-files','tests/browser/*.html'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const failures=[],rows=[];let scripts=0;
for(const file of files){
 const html=readFileSync(file,'utf8');let index=0;
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  const attributes=match[1],source=match[2],type=attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
  if(/\bsrc\s*=/i.test(attributes)||!source.trim()||type&&!['module','text/javascript','application/javascript'].includes(type))continue;
  index++;scripts++;
  const result=spawnSync(process.execPath,['--check','--input-type='+ (type==='module'?'module':'commonjs')],{input:source,encoding:'utf8'});
  const row={file,index,sha256:createHash('sha256').update(source).digest('hex'),passed:result.status===0};rows.push(row);
  if(result.status!==0)failures.push({...row,error:result.stderr||String(result.error)});
 }
}
console.log(JSON.stringify({files:files.length,scripts,failures,rows},null,2));
if(failures.length)process.exitCode=1;

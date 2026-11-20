import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const f=read('.cache/native-first-use-reviewed-frozen.json');
assert.equal(f.cases.length,5);assert(f.cases.every(c=>c.exitCode===0));
for(const[p,h]of Object.entries(f.files))assert.equal(hash(p),h,p);
const prior=read('docs/guardian/performance/native-pipeline-gap-attribution-20261120-validation.json').inheritedValidation;
const command=[...prior.validation.command];
for(const p of ['tests/remote-prepared-first-use.test.js','tests/webgpu-picker.test.js'])if(!command.includes(p))command.push(p);
const out='.cache/native-first-use-full-validation.json';assert(!fs.existsSync(out));
const result={scope:'Fresh accepted 365-file selection plus first-use and picker regressions. Three historical exclusions remain open; not every repository test.',frozen:'.cache/native-first-use-reviewed-frozen.json',files:f.files};
result.syntax=[];for(const p of Object.keys(f.files)){execFileSync('.cache/tooling/node20.exe',['--check',p],{stdio:'pipe'});result.syntax.push(p);}
const save=()=>fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');save();
async function run(key,command,environment){
 const log='.cache/native-first-use-'+key+'.log',fd=fs.openSync(log,'w'),start=Date.now(),startedAt=new Date().toISOString();
 const child=spawn(command[0],command.slice(1),{env:{...process.env,...environment},stdio:['ignore',fd,fd]});
 const exitCode=await new Promise((res,rej)=>{child.on('error',rej);child.on('close',res);});fs.closeSync(fd);
 const row={command,environment,log,sha256:hash(log),exitCode,seconds:(Date.now()-start)/1000,startedAt,finishedAt:new Date().toISOString(),overlap:'Concurrent CPU validation/build only; all hardware measurements had finished.'};
 if(key==='validation'){const text=fs.readFileSync(log,'utf8');for(const k of ['tests','pass','fail','cancelled','skipped']){const m=text.match(new RegExp('^# '+k+' (\\d+)$','m'));assert(m,'Missing '+k);row[k]=+m[1];}}
 result[key]=row;save();console.log(JSON.stringify(row));return exitCode;
}
const codes=await Promise.all([run('validation',command,prior.validation.environment),run('build',prior.build.command,prior.build.environment)]);
for(const[p,h]of Object.entries(f.files))assert.equal(hash(p),h,p);
process.exit(codes.some(c=>c!==0)?1:0);

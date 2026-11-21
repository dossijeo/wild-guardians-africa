import {execFileSync, spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync, mkdirSync, writeFileSync, createWriteStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {authority, guards, integrationTests, isolationKeys} from './catalog.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const normalize = p => p.replaceAll('\\','/').replace(/^\.\//,'');
export function git(args) {return execFileSync('git',['-c','core.safecrlf=false',...args],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();}
export function files() {return [...new Set(git(['ls-files','-z','--cached','--others','--exclude-standard']).split('\0').filter(Boolean))];}
export const digest = data => createHash('sha256').update(data).digest('hex');
export function fingerprint() {
  const hashes = {};
  for (const file of files().sort()) {
    if (!( /^(src|tests|tools)\//.test(file) && /\.(js|mjs|cjs|cpp|h|inc|wasm|sh|py|json)$/.test(file)) && !authority.includes(file) && !/^(package(-lock)?\.json|public\/wild-engine\/)/.test(file)) continue;
    hashes[file] = existsSync(path.join(root,file)) ? digest(readFileSync(path.join(root,file))) : 'deleted';
  }
  return {head:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),node:process.version,hashes,digest:digest(JSON.stringify(hashes))};
}
export function changedFiles(base) {
  // --no-renames includes both sides of renames; staged, unstaged and untracked.
  const changed = git(['diff','--no-renames','--name-only','-z',...(base?[`${base}...HEAD`]:['HEAD'])]).split('\0');
  if(base) changed.push(...git(['diff','--no-renames','--name-only','-z','HEAD']).split('\0'));
  changed.push(...git(['ls-files','--others','--exclude-standard','-z']).split('\0'));
  return [...new Set(changed.filter(Boolean).map(normalize))].sort();
}
export function selectTests(changed, tier='focused', inventory=files(), read=p=>existsSync(path.join(root,p))?readFileSync(path.join(root,p),'utf8'):'') {
  if(!['focused','integration','broad'].includes(tier)) throw Error(`Unknown tier: ${tier}`);
  const all = inventory.filter(p=>/^tests\/.*\.test\.js$/.test(p)).sort();
  const affected = new Set(changed.map(normalize)), reasons = new Map();
  const choose=(p,reason)=>{if(!all.includes(p)) throw Error(`Required test missing: ${p}`);if(!reasons.has(p))reasons.set(p,[]);if(!reasons.get(p).includes(reason))reasons.get(p).push(reason);};
  const sources=inventory.filter(p=>/\.(js|mjs|cjs)$/.test(p)&&/^(src|tests|tools)\//.test(p));
  const dependencies = new Map(sources.map(file=>{
    const text=read(file), deps=[];
    // Static import/export, literal dynamic import and require. Unknown edges
    // are covered by the conservative native/build/unknown fallbacks below.
    for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](\.[^'"]+)['"]/g)) deps.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1])));
    return [file,deps];
  }));
  let grew=true;
  while(grew){grew=false;for(const [file,deps] of dependencies)if(!affected.has(file)&&deps.some(d=>affected.has(d))){affected.add(file);grew=true;}}
  for(const file of all)if(affected.has(file))choose(file,'modified or transitive local import');
  const runtime=changed.some(p=>/^(src|public\/wild-engine|tests\/browser|tests\/helpers)\//.test(p));
  const native=changed.some(p=>/wild-engine|build-spatial|\.wasm$/.test(p));
  const unknown=changed.filter(p=>!/^docs\//.test(p)&&!/^tools\/guardian\/migration-support\//.test(p)&&!/^tests\/.*\.test\.js$/.test(p)&&!/^src\/.*\.(js|mjs)$/.test(p)&&!/^tests\/(helpers|browser)\//.test(p));
  if(runtime)for(const p of guards)choose(p,'mandatory authority/causality/resource safety');
  if(native)for(const p of all.filter(p=>/\/spatial-|\/native-|\/worker-game|\/remote-webgpu/.test(p)))choose(p,'native ABI and semantic coverage');
  if(tier!=='focused'&&runtime)for(const p of integrationTests)choose(p,'integration boundary');
  const unowned=changed.filter(p=>{
    if(!/^src\//.test(p))return false;
    const reachable=new Set([p]);let grew=true;
    while(grew){grew=false;for(const [file,deps] of dependencies)if(!reachable.has(file)&&deps.some(d=>reachable.has(d))){reachable.add(file);grew=true;}}
    return !all.some(t=>reachable.has(t));
  });
  if(tier==='broad'||unknown.length||unowned.length)for(const p of all)choose(p,tier==='broad'?'broad regression':'unmapped/build/asset change: conservative full fallback');
  return {tier,changed,tests:[...reasons.keys()].sort(),reasons:Object.fromEntries(reasons),conservativeFallback:[...unknown,...unowned],
    browserRequired:runtime&&tier!=='focused',buildRequired:changed.some(p=>/^(src|public|package|vite|tools\/build)/.test(p)),
    limitation:'Import selection is advisory; focused tests never close an A6 vertical. Unknown inputs expand coverage.'};
}
export function runDirectory(label) {
  const dir=path.join(root,'.cache/migration-support',`${new Date().toISOString().replaceAll(':','-')}-${label}-${process.pid}`);
  mkdirSync(dir,{recursive:true});return dir;
}
export async function command(args,dir,name,{env={},timeoutMs=600000}={}) {
  const log=path.join(dir,`${name}.log`), stream=createWriteStream(log),startedAt=new Date().toISOString();
  const childEnv={...process.env};for(const key of isolationKeys)delete childEnv[key];
  const localNode20=path.join(root,'.cache/tooling/node20.exe');
  const executable=process.env.MIGRATION_NODE??(Number(process.versions.node.split('.')[0])>=22&&existsSync(localNode20)?localNode20:process.execPath);
  const effectiveEnv={WILD_ENGINE_NATIVE_ROUTE_WASM:process.env.WILD_ENGINE_NATIVE_ROUTE_WASM??path.join(root,'src/world/wild-engine/spatial-savanna.wasm'),...env};
  const nativeBinary=effectiveEnv.WILD_ENGINE_NATIVE_ROUTE_WASM;
  const runtimeVersion=execFileSync(executable,['--version'],{encoding:'utf8'}).trim();
  const nativeBinarySha256=existsSync(nativeBinary)?digest(readFileSync(nativeBinary)):null;
  Object.assign(childEnv,effectiveEnv);
  const child=spawn(executable,args,{cwd:root,env:childEnv,windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});
  let timedOut=false,error=null;
  const timer=setTimeout(()=>{
    timedOut=true;
    // Only the child tree created by this invocation. A hung browser runner
    // must not leave its own Edge processes behind or kill another agent's.
    if(process.platform==='win32'&&child.pid){
      const killer=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
      killer.on('error',()=>child.kill());
    }else child.kill();
  },timeoutMs);
  const code=await new Promise(resolve=>{child.on('error',e=>{error=String(e);resolve(null);});child.on('close',resolve);});
  clearTimeout(timer);await new Promise(resolve=>stream.end(resolve));
  const logText=readFileSync(log,'utf8'),counts=Object.fromEntries([...logText.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gm)].map(m=>[m[1],Number(m[2])]));
  const incomplete=(counts.skipped??0)+(counts.todo??0)+(counts.cancelled??0)>0;
  return {command:[executable,...args],runtimeVersion,nativeBinarySha256,environment:effectiveEnv,startedAt,finishedAt:new Date().toISOString(),code,timedOut,error,counts,log:normalize(path.relative(root,log)),logSha256:digest(readFileSync(log)),status:code!==0||timedOut||error?'failed':incomplete?'incomplete':'passed'};
}
export function saveReport(dir,report,before) {
  const after=fingerprint();
  const changed=Object.fromEntries([...new Set([...Object.keys(before.hashes),...Object.keys(after.hashes)])].filter(p=>before.hashes[p]!==after.hashes[p]).map(p=>[p,{before:before.hashes[p]??null,after:after.hashes[p]??null}]));
  report.context={before,afterDigest:after.digest,afterHead:after.head,changed,stable:before.digest===after.digest&&before.head===after.head};
  if(!report.context.stable)report.invalidatedByConcurrentEdits=true;
  const output=path.join(dir,'report.json');writeFileSync(output,JSON.stringify(report,null,2)+'\n');return output;
}
export function browserJobs(names,scenarios) {
  const seen=new Set();return names.flatMap(name=>{
    const s=scenarios[name];if(!s)throw Error(`Unknown scenario: ${name}`);if(!s.browser)return [];
    const key=JSON.stringify([s.browser,s.env]);if(seen.has(key))return [];seen.add(key);return [{name,script:s.browser,env:s.env}];
  });
}

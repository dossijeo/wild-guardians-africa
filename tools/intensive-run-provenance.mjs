import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Record inputs before a long campaign starts: later commits must not be
// mistaken for the code already loaded by that process.
export function intensiveRunProvenance(args){
  const root=new URL('../',import.meta.url),cwd=fileURLToPath(root);
  const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const sourceHashes={};
  const scan=relative=>{
    for(const entry of readdirSync(new URL(relative,root),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const path=relative+entry.name;
      if(entry.isDirectory())scan(path+'/');
      else if(/\.(?:js|json)$/.test(path))sourceHashes[path]=hash(readFileSync(new URL(path,root)));
    }
  };
  scan('src/');
  for(const path of ['package-lock.json','tools/check_intensive_farm.mjs','tools/check_opening.mjs','tools/intensive-run-provenance.mjs'])sourceHashes[path]=hash(readFileSync(new URL(path,root)));
  return {startedAt:new Date().toISOString(),node:process.version,arguments:args,gitHead:git('rev-parse','HEAD'),trackedChanges:git('diff','--name-only','HEAD').split('\n').filter(Boolean),sourceHashes};
}

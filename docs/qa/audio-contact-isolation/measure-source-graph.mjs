import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),baseline='bfb65e6',sha=b=>createHash('sha256').update(b).digest('hex');
function graph(old){
 const modules=new Map(),external=new Set();
 function visit(path){
  if(modules.has(path))return;const relative=path.slice(root.length+1).replaceAll('\\','/');
  const text=old?execFileSync('git',['show',baseline+':'+relative],{encoding:'utf8'}):readFileSync(path,'utf8');
  modules.set(relative,{bytes:Buffer.byteLength(text),sha256:sha(text)});
  for(const match of text.matchAll(/^(?:import|export)\s+.*?\bfrom\s+['"]([^'"]+)['"]/gm)){
   if(match[1].startsWith('.'))visit(resolve(dirname(path),match[1]));else external.add(match[1]);
  }
 }
 visit(resolve(root,'src/audio/audio.js'));
 return {modules:Object.fromEntries(modules),count:modules.size,bytes:[...modules.values()].reduce((n,x)=>n+x.bytes,0),external:[...external].sort()};
}
const before=graph(true),after=graph(false);mkdirSync('docs/qa/audio-contact-isolation',{recursive:true});writeFileSync('docs/qa/audio-contact-isolation/graph.json',JSON.stringify({baseline,scope:'Static single-line ESM import/reexport graph, including JSON; original baseline from Git, not runtime downloads, RAM or frametime.',before,after},null,2)+'\n');console.log(JSON.stringify({before:{count:before.count,bytes:before.bytes,external:before.external},after:{count:after.count,bytes:after.bytes,external:after.external}}));

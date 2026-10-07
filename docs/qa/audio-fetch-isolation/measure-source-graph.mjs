import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),entry='src/audio/audio.js',sha=b=>createHash('sha256').update(b).digest('hex');
function graph(old){
 const modules=new Map(),external=new Set();
 function visit(path){
  if(modules.has(path))return;let text=readFileSync(path,'utf8');if(old&&path===resolve(root,entry))text=text.replace("from '../rendering/asset-fetch.js'","from '../rendering/assets.js'");
  modules.set(path,{bytes:Buffer.byteLength(text),sha256:sha(text)});
  for(const match of text.matchAll(/^(?:import|export)\s+.*?\bfrom\s+['"]([^'"]+)['"]/gm)){
   if(match[1].startsWith('.'))visit(resolve(dirname(path),match[1]));else external.add(match[1]);
  }
 }
 visit(resolve(root,entry));
 return {scope:'Static single-line ESM from declarations, including JSON and reexports; source bytes, not download/parse time or production bundle size.',modules:Object.fromEntries([...modules].map(([p,data])=>[p.slice(root.length+1).replaceAll('\\','/'),data])),count:modules.size,bytes:[...modules.values()].reduce((n,x)=>n+x.bytes,0),external:[...external].sort()};
}
const before=graph(true),after=graph(false);mkdirSync('docs/qa/audio-fetch-isolation',{recursive:true});writeFileSync('docs/qa/audio-fetch-isolation/graph.json',JSON.stringify({before,after},null,2)+'\n');console.log(JSON.stringify({before:{count:before.count,bytes:before.bytes,external:before.external},after:{count:after.count,bytes:after.bytes,external:after.external}}));

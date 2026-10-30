import fs from 'node:fs';import path from 'node:path';import {packWallBuffers} from './pack-wall-buffers.mjs';
export function packageWallBank(root){
 const files=['content/walls.json','library/walls/bastion-assets.json','content/lighting/global-ao/walls.json'];
 const pack=JSON.parse(fs.readFileSync(path.join(root,files[0]))),{binary,ranges}=packWallBuffers(pack,url=>fs.readFileSync(path.join(root,url.replace(/^\//,''))));
 const byURL=new Map(ranges.map(r=>[r.url,r])),bankURL='content/wall-buffers.bin';
 const rewrite=value=>{
  if(typeof value==='string'&&byURL.has(value))return 'repository:'+value;
  if(Array.isArray(value))return value.map(rewrite);
  if(value&&typeof value==='object'){const out=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)]));const r=byURL.get(value.url);if(r){out.bankOffset=r.offset;out.bankLength=r.byteLength;}return out;}
  return value;
 };
 // Fail closed if an additional runtime consumer still references a source.
 function check(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){check(p);continue;}const rel=path.relative(root,p).replaceAll('\\','/');if(files.includes(rel)||! /\.(json|js|html|css)$/.test(p))continue;const text=fs.readFileSync(p,'utf8');for(const r of ranges)if(text.includes(path.basename(r.url)))throw Error('Additional wall buffer consumer: '+rel);}}
 check(root);
 for(const file of files){const value=rewrite(JSON.parse(fs.readFileSync(path.join(root,file))));if(value.pieces)value.bufferBank={url:bankURL,byteLength:binary.length};fs.writeFileSync(path.join(root,file),JSON.stringify(value));}
 fs.writeFileSync(path.join(root,bankURL),binary);
 for(const r of ranges){const target=path.resolve(root,r.url.replace(/^\//,''));if(!target.startsWith(path.resolve(root,'assets')+path.sep))throw Error('Wall source outside assets');fs.unlinkSync(target);}
 return {filesSaved:ranges.length-1,bytes:binary.length};
}

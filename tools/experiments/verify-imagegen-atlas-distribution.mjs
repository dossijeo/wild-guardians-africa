import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=path.resolve(process.argv[2]??'dist');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await fs.readFile(path.join(root,'content/far-vegetation.json'),'utf8'));
if(manifest.artRevision!=='imagegen-20261026')throw Error('Distribution does not contain installed imagegen manifest');
const entries=Object.values(manifest.biomes).flat(),results=[];
if(entries.length!==22)throw Error('Expected 22 species including two original Canyon species');
for(const entry of entries)for(const phase of ['day','night']){
 const relative=entry[phase].replace(/^\.\//,'');
 if(!/^assets\/far-vegetation\/[a-z_]+-\d+-(day|night)\.webp$/.test(relative))throw Error(`Unsafe or QA atlas path ${relative}`);
 const bytes=await fs.readFile(path.join(root,relative)),hash=sha(bytes),metadata=await sharp(bytes).metadata();
 if(hash!==entry.runtimeSha256?.[phase])throw Error(`Distribution pixel hash mismatch ${relative}`);
 if(metadata.width!==1024||metadata.height!==1024||!metadata.hasAlpha||entry.views!==8||entry.rotationViews!==8||entry.viewResolution!==128||entry.prelitAlphaEncoding!=='srgb-encoded-linear-premultiplied')throw Error(`Incompatible atlas ${relative}`);
 results.push({path:relative,bytes:bytes.length,sha256:hash});
}
async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name),relative=path.relative(root,file).replaceAll('\\','/');if(/(^|\/)(docs\/qa|tree-atlas-refresh-20261026|tree-candidates-20261026)(\/|$)|imagegen-candidate|imagegen-runtime|imagegen-inventory|imagegen-manifest|imagegen-tmp/.test(relative))throw Error(`QA/staging resource leaked into distribution: ${relative}`);if(item.isDirectory())await walk(file);}}
await walk(root);
console.log(JSON.stringify({verified:true,root,atlases:results.length,bytes:results.reduce((n,x)=>n+x.bytes,0),qaAssets:false,files:results},null,2));

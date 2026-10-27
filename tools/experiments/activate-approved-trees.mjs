import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// Promote only the five approved packs. Preserve all non-tree production data.
const biomes=['savanna','grand_river','mangrove','desert','volcanoes'];
const root='public/assets/trees-20261026';
await mkdir(root,{recursive:true});
const report=[];
for(const biome of biomes){
 const candidate=JSON.parse(await readFile(`public/assets/visual-lab/tree-candidates-20261026-lod/biome-${biome}.json`));
 const path=`public/content/biome-${biome}.json`,pack=JSON.parse(await readFile(path));
 const source=await readFile('public'+candidate.binary.url),old=await readFile('public'+pack.binary.url);
 const chunks=[],seen=new Map();let length=0;
 const copy=(descriptor,buffer)=>{
  const size=descriptor.count*(descriptor.type==='<u2'?2:4),bytes=buffer.subarray(descriptor.offset,descriptor.offset+size);
  if(bytes.length!==size)throw Error('Invalid geometry range');
  const key=descriptor.type+':'+createHash('sha256').update(bytes).digest('hex');
  if(!seen.has(key)){const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}seen.set(key,length);chunks.push(bytes);length+=size;}
  return {...descriptor,offset:seen.get(key)};
 };
 pack.textureSets=structuredClone(candidate.textureSets);
 for(const set of pack.textureSets)for(const texture of set){const bytes=await readFile('public'+texture.base64.url),extension=texture.base64.url.split('.').pop(),url=`/assets/trees-20261026/${createHash('sha256').update(bytes).digest('hex')}.${extension}`;await writeFile('public'+url,bytes);texture.base64.url=url;}
 for(let i=0;i<pack.assets.length;i++){
  const replacement=candidate.assets.find(a=>a.slot===pack.assets[i].slot&&a.textureSet!==undefined);
  if(replacement){
   pack.assets[i]=structuredClone(replacement);
   // Candidate manifests may carry bounds from the original tree. Contacts
   // must describe the replacement geometry, not the asset it supersedes.
   const d=replacement.lods[0].position;
   const positions=new Float32Array(source.buffer,source.byteOffset+d.offset,d.count);
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(let n=0;n<positions.length;n++){
    if(!Number.isFinite(positions[n]))throw Error('Invalid tree position');
    min[n%3]=Math.min(min[n%3],positions[n]);max[n%3]=Math.max(max[n%3],positions[n]);
   }
   Object.assign(pack.assets[i],{min,max});
  }
  for(const lod of pack.assets[i].lods)for(const [name,value]of Object.entries(lod))if(value&&Number.isInteger(value.offset)&&Number.isInteger(value.count))lod[name]=copy(value,replacement?source:old);
 }
 pack.binary.url=`/assets/trees-20261026/${biome}.bin`;
 await writeFile('public'+pack.binary.url,Buffer.concat(chunks));
 await writeFile(path,JSON.stringify(pack));
 report.push({biome,previousGeometryBytes:old.length,geometryBytes:length});
}
console.log(JSON.stringify(report,null,2));

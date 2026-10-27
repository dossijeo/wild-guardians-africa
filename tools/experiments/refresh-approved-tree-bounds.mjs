import {readFileSync,writeFileSync} from 'node:fs';

// Recompute metadata from the installed full-detail mesh, without changing art
// or geometry. The replacement importer previously retained the old bounds.
const report=[];
for(const biome of ['savanna','grand_river','mangrove','desert','volcanoes']){
 const file=`public/content/biome-${biome}.json`,pack=JSON.parse(readFileSync(file));
 const binary=readFileSync('public'+pack.binary.url);
 for(const asset of pack.assets){
  if(asset.textureSet===undefined)continue;
  const d=asset.lods[0].position;
  const values=new Float32Array(binary.buffer,binary.byteOffset+d.offset,d.count);
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<values.length;i++){
   if(!Number.isFinite(values[i]))throw Error(`Invalid position: ${biome}/${asset.slot}`);
   min[i%3]=Math.min(min[i%3],values[i]);max[i%3]=Math.max(max[i%3],values[i]);
  }
  if(JSON.stringify([asset.min,asset.max])!==JSON.stringify([min,max])){
   report.push({biome,slot:asset.slot,before:[asset.min,asset.max],after:[min,max]});
   asset.min=min;asset.max=max;
  }
 }
 writeFileSync(file,JSON.stringify(pack));
}
console.log(JSON.stringify(report,null,2));

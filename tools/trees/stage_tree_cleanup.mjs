// Explicit selections made from front/rear screenshots and component bounds.
import fs from 'node:fs';
const audit=JSON.parse(fs.readFileSync('docs/lighting/tree-near-retexture/components.json'));
const selections=[
 {biome:'savanna',slot:'tree_02',ids:[[0],[0],[0]],reason:'Detached crown piece to the left of the acacia, above its lower branch canopy.'},
 {biome:'grand_river',slot:'tree_02',ids:[[43,44,45,46],[127,129,130,132],[319,328,329,332]],reason:'Four crown surfaces floating above the complete rooted tree, separated by open air.'},
 {biome:'grand_river',slot:'tree_04',ids:[[0],[1],[1]],reason:'Detached broadleaf crown piece beside the palm fronds.'}
];
const report=[];
for(const selection of selections){
 const file=`public/content/biome-${selection.biome}.json`,pack=JSON.parse(fs.readFileSync(file));
 const asset=pack.assets.find(a=>a.slot===selection.slot);
 const levels=selection.ids.map((ids,level)=>{
  const record=audit.assets.find(a=>a.biome===selection.biome&&a.slot===selection.slot&&a.level===level);
  const components=ids.map(id=>{const component=record.components.find(c=>c.id===id);if(!component)throw Error('Missing selected component');return component;});
  return [...new Set(components.flatMap(c=>c.triangleIndices))].sort((a,b)=>a-b);
 });
 asset.geometryCleanup={removedTriangles:levels,reason:selection.reason};
 if(selection.biome==='grand_river'&&selection.slot==='tree_04')asset.doubleSidedFoliage=true;
 fs.writeFileSync(file,JSON.stringify(pack)+'\n');report.push({...selection,removedTriangleCounts:levels.map(a=>a.length)});
}
fs.writeFileSync('docs/lighting/tree-near-retexture/cleanup-selections.json',JSON.stringify(report,null,2)+'\n');
console.log(report);

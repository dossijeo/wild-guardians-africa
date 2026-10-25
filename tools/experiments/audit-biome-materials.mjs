import {readFile,stat,writeFile} from 'node:fs/promises';import sharp from 'sharp';
const ground=JSON.parse(await readFile('public/content/ground-materials.json','utf8')),rows=[];
for(const [biome,tile] of Object.entries(ground)){
 const pack=JSON.parse(await readFile(`public/content/biome-${biome}.json`,'utf8')),maps={};
 for(const role of ['base','normal','arh']){if(!tile[role]){maps[role]={fallback:true};continue;}const path='public'+tile[role],m=await sharp(path).metadata();maps[role]={url:tile[role],width:m.width,height:m.height,fileBytes:(await stat(path)).size,rgba8MipBytesEstimate:m.width*m.height*4*4/3};}
 const vegetation=pack.assets.filter(a=>(/^(tree|shrub|plant)_/.test(a.slot)&&!(biome==='canyons'&&['tree_03','tree_04','shrub_01'].includes(a.slot))||biome==='grand_river'&&a.slot==='special_01')).map(a=>({slot:a.slot,name:a.name,lodTriangles:a.lods?.map(l=>l.triangles)}));
 rows.push({biome,name:tile.name,scale:tile.scale,normalBoost:tile.normalBoost,reliefConfigured:tile.relief??0,pureMoss:!!tile.pureMoss,parallaxPath:biome==='desert'?'legacy shader, no height map':tile.pureMoss?'pure moss early return, no parallax':'up to 8 ARH B samples near camera',maps,independentMud:tile.mudPatches??null,nativeAssetSlots:pack.assets.length,vegetation});
}
await writeFile('docs/qa/global-visual-lab/grass-beds/biome-material-audit.json',JSON.stringify(rows,null,2)+'\n');console.log(rows.map(r=>({biome:r.biome,maps:Object.fromEntries(Object.entries(r.maps).map(([k,v])=>[k,v.fallback?'fallback':`${v.width}x${v.height}`])),vegetation:r.vegetation.length})));

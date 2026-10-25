import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import {Geometry} from '../../src/rendering/terrain-source.js';
const source=await readFile('tools/experiments/qa-canyon-adaptive-horizon-20261022.js','utf8');
const build=Function('Geometry',source.replace(/^import[^\n]+\n/,'').replace('export function','function')+';return buildAdaptiveHorizon;')(Geometry);
const core=createSpatialWorld(new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm')));core.generate(712,0,0,'canyons');const rows=[];
for(const eye of [{x:0,z:96},{x:-48,z:192},{x:0,z:288}]){
 const region=activeChunkRegion(eye,'media'),before=core.metrics(),selected=core.currentChunk(),data=build(core,region,[.1,.4,.5],true),edges=new Map(),coords=new Map(),v=data.terrain;
 const id=i=>{const k=`${v[i]},${v[i+1]},${v[i+2]}`;coords.set(k,[v[i],v[i+2]]);return k;};
 for(let i=0;i<v.length;i+=27){const p=[id(i),id(i+9),id(i+18)];for(let j=0;j<3;j++){const e=[p[j],p[(j+1)%3]].sort(),k=e.join('|');edges.set(k,(edges.get(k)??0)+1);}}
 let cracks=0,nonManifold=0,boundaries=0;
 const [x0,z0,x1,z1]=region.bounds.map((v,i)=>v-(i%2?region.cz:region.cx)*48);
 for(const [key,count]of edges){if(count>2)nonManifold++;if(count!==1)continue;boundaries++;const [a,b]=key.split('|').map(k=>coords.get(k));const allowed=(a[0]===b[0]&&[-384,384,x0,x1].includes(a[0]))||(a[1]===b[1]&&[-384,384,z0,z1].includes(a[1]));if(!allowed)cracks++;}
 if(cracks||nonManifold)throw Error(JSON.stringify({cracks,nonManifold}));
 if(JSON.stringify(before)!==JSON.stringify(core.metrics())||JSON.stringify(selected)!==JSON.stringify(core.currentChunk()))throw Error('Spatial state changed');
 rows.push({eye,...data.adaptiveBuild,cracks,nonManifold,boundaries,terrainBytes:v.byteLength});
}
await mkdir('docs/qa/global-visual-lab/canyon-horizon-adaptive-20261022',{recursive:true});await writeFile('docs/qa/global-visual-lab/canyon-horizon-adaptive-20261022/topology.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));

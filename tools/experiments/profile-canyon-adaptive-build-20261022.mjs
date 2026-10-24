import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {activeChunkRegion} from '../../src/world/active-region.js';
import {Geometry} from '../../src/rendering/terrain-source.js';
const source=await readFile('tools/experiments/qa-canyon-adaptive-horizon-20261022.js','utf8');
const build=Function('Geometry',source.replace(/^import[^\n]+\n/,'').replace('export function','function')+';return buildAdaptiveHorizon;')(Geometry);
const core=createSpatialWorld(new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm')));core.generate(712,0,0,'canyons');const rows=[];

const fastSource=await readFile('tools/experiments/qa-canyon-adaptive-fast-20261022.js','utf8');
const fast=Function('Geometry',fastSource.replace(/^import[^\n]+\n/,'').replace('export function','function')+';return buildAdaptiveHorizon;')(Geometry);
const {isDeepStrictEqual}=await import('node:util');
for(const eye of [{x:0,z:96},{x:-48,z:192},{x:0,z:288}]){
 const region=activeChunkRegion(eye,'media');let reference;
 for(let run=0;run<8;run++){
  const variant=run%2?'fast':'original',data=(run%2?fast:build)(core,region,[.1,.4,.5],true);
  reference??=data;
  if(!isDeepStrictEqual(reference.terrain,data.terrain)||!isDeepStrictEqual(reference.water,data.water))throw Error('Buffer equivalence failure');
  rows.push({eye,run,variant,...data.adaptiveBuild,exactBuffers:true});
 }
}
const out='docs/qa/global-visual-lab/canyon-adaptive-build-cost-20261022';await mkdir(out,{recursive:true});await writeFile(out+'/profile.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));

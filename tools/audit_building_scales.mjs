import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {geometryOnly} from './calibrate_footsteps.mjs';
import {prepareNativeBuilding} from '../src/rendering/buildings.js';

const root=new URL('../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root)));
const villages=read('public/content/villages.json');
const catalogue=read('public/content/destruction.json').buildings;
const dimensions=bounds=>bounds.max.map((value,index)=>value-bounds.min[index]);
const rows=[];
for(const building of catalogue){
  const bytes=readFileSync(new URL('public'+building.url,root));
  const gltf=await new GLTFLoader().parseAsync(geometryOnly(bytes),'');
  const template=prepareNativeBuilding(gltf,building);
  const village=villages.find(v=>v.id===({saheliana:'saheliano'}[building.culture]??building.culture));
  rows.push({culture:building.culture,url:building.url,
    sha256:createHash('sha256').update(bytes).digest('hex'),
    nativeDimensions:dimensions(template.kernel.bounds),
    currentScale:template.scale,
    currentDimensions:dimensions(template.kernel.bounds).map(value=>value*template.scale),
    nativeRadius:Math.max(...template.kernel.hull.map(point=>Math.hypot(...point))),
    nativeHull:template.kernel.hull,
    villageScale:16,
    villageBuildings:village.units.filter(unit=>unit.kind==='Edificio').map(unit=>({
      key:unit.key,dimensions:dimensions(unit).map(value=>value*16)
    }))});
  template.dispose();
}
const result={schema:'wg-building-scale-audit/1',
  method:'Original GLB geometry with the original DEST patches and rigid centring; current renderer scale compared to native scale 1. Village layout uses the original lab scale 16. Dimensions are world units, not independently certified metres.',
  rows};
writeFileSync(new URL('content/manifests/building-scale-audit.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(row=>({culture:row.culture,nativeHeight:row.nativeDimensions[1],currentHeight:row.currentDimensions[1],scale:row.currentScale})),null,2));

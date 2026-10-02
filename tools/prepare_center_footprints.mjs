import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {geometryOnly} from './calibrate_footsteps.mjs';
import {prepareNativeBuilding} from '../src/rendering/buildings.js';
const root=new URL('../',import.meta.url),catalogue=JSON.parse(readFileSync(new URL('public/content/destruction.json',root))).buildings;
const cultures={};
for(const building of catalogue){
 const bytes=readFileSync(new URL('public'+building.url,root)),model=await new GLTFLoader().parseAsync(geometryOnly(bytes),'');
 const template=prepareNativeBuilding(model,building);
 cultures[building.culture]={url:building.url,sha256:createHash('sha256').update(bytes).digest('hex'),bounds:template.kernel.bounds,hull:template.kernel.hull,radius:Math.max(...template.kernel.hull.map(p=>Math.hypot(...p)))};
 template.dispose();
}
writeFileSync(new URL('content/manifests/center-footprints.json',root),JSON.stringify({schema:'wg-center-footprints/1',method:'Native scale 1; original DEST rigid centring and geometry patches; convex XZ hull of the rendered building.',cultures},null,2)+'\n');
writeFileSync(new URL('src/world/center-geometries.js',root),'// Generated from the five original DEST GLB by tools/prepare_center_footprints.mjs.\nexport const CENTER_GEOMETRIES = '+JSON.stringify(cultures)+';\n');
console.log('Five native center footprints prepared');

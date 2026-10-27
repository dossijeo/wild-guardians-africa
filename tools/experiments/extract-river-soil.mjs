import {readFile,writeFile} from 'node:fs/promises';
import {installRiverSoilLayerV2Route} from './qa-river-soil-layer-v2-route.mjs';
const changed={};
await installRiverSoilLayerV2Route({route:async(pattern,fn)=>{const path=pattern.replace('**/','').replaceAll('*','');await fn({fetch:async()=>({text:()=>readFile(path,'utf8')}),fulfill:async({body})=>{changed[path]=body}})}},true);
const module=await import('data:text/javascript;base64,'+Buffer.from(changed['src/rendering/biome-material-source.js']).toString('base64'));
const source=module.groundMaterialFunctions,anchor='materialAO410=mix(1.,mix(.45,1.,arh.r),amount);',start=source.indexOf(anchor),end=source.indexOf('  }\n }',start)+'  }\n }'.length;
if(start<0||end<start)throw Error('Soil recipe extraction failed');
const edits=[['uniform sampler2D uGroundMask,uGroundDetailMap,uGroundNormal;','uniform sampler2D uGroundMask,uGroundDetailMap,uGroundNormal;uniform sampler2D uQaSoilBase,uQaSoilNormal,uQaSoilARH;'],['float reliefMask=canyon?canyonFlat:up;','float reliefMask=canyon?canyonFlat:up;if(river)reliefMask*=1.-smoothstep(.12,.70,wear);'],[anchor,source.slice(start,end)]];
await writeFile('src/rendering/global-river-soil.js',`// Retained V2 soil recipe; explicit laboratory option, existing CC0 Ground079S maps.
export function riverSoilEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('riverSoil')==='1';
}
export function patchRiverSoil(source){
 const edits=${JSON.stringify(edits,null,2)};
 for(const [before,after] of edits){if(!source.includes(before))throw Error('River soil shader anchor missing: '+before);source=source.replace(before,after);}return source;
}
`);

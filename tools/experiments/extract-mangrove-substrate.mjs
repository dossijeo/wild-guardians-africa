import {readFile,writeFile} from 'node:fs/promises';
import {installMangroveHeightBlendRoute} from './qa-mangrove-height-blend-route.mjs';
const changed={};
await installMangroveHeightBlendRoute({route:async(pattern,fn)=>{const name=pattern.split('/').at(-1).replace('*','');await fn({fetch:async()=>({text:()=>readFile('src/rendering/'+name,'utf8')}),fulfill:async({body})=>{changed[name]=body}})}},{height:true,calibrated:true,linearSoil:true,toonSoil:true,skipUnusedLighting:true});
const module=await import('data:text/javascript;base64,'+Buffer.from(changed['biome-material-source.js']).toString('base64'));
const s=module.groundMaterialFunctions,start=s.indexOf('vec2 ctxUV=((worldP.xz-uGroundRect.xy)'),end=s.indexOf('materialCover410=mossCover;return;',start)+'materialCover410=mossCover;return;'.length;
if(start<0||end<start)throw Error('Recipe extraction failed');
const patch=s.slice(start,end),anchor='rough=clamp(arh.g,.5,.99);wet=0.;materialAO410=mix(.45,1.,arh.r);materialCover410=1.;return;';
const light=changed['african-toon.js'],lit='outgoingLight=toLinear4(filmic4(groundLit));',a=light.indexOf(lit+'}')+(lit+'}').length,b=light.indexOf('\n        }else outgoingLight=',a),soil=light.slice(a,b);
if(!soil.includes('qaSoilWeight>0.'))throw Error('Lighting extraction failed');
const source=`// Full approved laboratory substrate, preserving calibrated height blend and separate soil lighting.
export function mangroveSubstrateEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('mangroveSubstrate')==='full';
}
export function patchMangroveSubstrate(source){
 const edits=[
 ['void groundMaterial417(', 'uniform sampler2D uLayerSandBase,uLayerSandNormal,uLayerSandARH;vec3 qaSoilAlbedo=vec3(0.),qaSoilNormal=vec3(0.,1.,0.);float qaSoilRough=1.,qaSoilWeight=0.;void groundMaterial417('],
 [${JSON.stringify(anchor)},${JSON.stringify(patch)}],
 ['vec3 biomeSun=','outgoingLight=vec3(0.);if(qaSoilWeight<1.){vec3 biomeSun='],
 [${JSON.stringify(lit)},${JSON.stringify(lit+'}'+soil)}]
 ];
 for(const [before,after] of edits){if(!source.includes(before))throw Error('Mangrove substrate shader anchor missing: '+before);source=source.replace(before,after);}return source;
}
`;
await writeFile('src/rendering/global-mangrove-substrate.js',source);

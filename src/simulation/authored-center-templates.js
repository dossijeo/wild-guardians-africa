import {assetUrl} from '../rendering/asset-url.js';
import {centerCulture} from '../world/centers.js';
import webAssets from '../../content/manifests/web-assets.json' with {type:'json'};

// QA-only loader for offline-captured physical bounds. No meshes or textures
// are required in the simulation Worker. Unknown or stale input fails closed.
export async function loadAuthoredCenterTemplates(state,{fetcher=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
 if(!state||!Array.isArray(state.villages)||!Array.isArray(state.structures)||typeof fetcher!=='function'||!subtle)throw TypeError('Invalid authored center template request');
 const read=async path=>{const response=await fetcher(assetUrl(path));if(!response.ok)throw Error('Center template resource unavailable: '+path);return response.json();};
 const [manifest,catalog]=await Promise.all([read('/content/worker-center-templates.json'),read('/content/destruction.json')]);
 if(manifest?.version!==1||!manifest.templates||!Array.isArray(catalog?.buildings))throw Error('Invalid authored center manifest');
 const cultures=new Set([...state.villages.map(v=>v.culture),...state.structures.filter(s=>s.kind==='center').map(center=>centerCulture(center,state))]),result=Object.create(null);
 for(const culture of cultures){
  const matching=catalog.buildings.filter(item=>item.culture===culture),record=manifest.templates[culture];if(matching.length!==1||!record)throw Error('Missing authored center template: '+culture);
  const descriptor=matching[0],{url,...parameters}=descriptor,digest=Array.from(new Uint8Array(await subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(parameters))))).map(value=>value.toString(16).padStart(2,'0')).join('');
  const mapping=webAssets.records.find(item=>item.source===`assets/${record.modelSha256}.glb`);
  if(record.descriptorSha256!==digest||record.modelUrl!==descriptor.url||!new RegExp('/'+record.modelSha256+'\\.glb$').test(record.modelUrl)||!/^[0-9a-f]{64}$/.test(record.modelSha256)||!mapping||mapping.runtime!==record.runtimeUrl?.replace(/^\//,'')||mapping.runtimeSha256!==record.runtimeSha256)throw Error('Stale authored center template: '+culture);
  const template=record.template;if(template?.version!==1||!Array.isArray(template.scale)||template.scale.length!==3||template.scale.some(value=>!Number.isFinite(value)||value<=0)||!Array.isArray(template.parts)||!template.parts.length)throw Error('Invalid authored center bounds: '+culture);
  for(const part of template.parts)if(![part.min,part.max,part.matrix].every((array,index)=>Array.isArray(array)&&array.length===(index===2?16:3)&&array.every(Number.isFinite))||part.min.some((value,index)=>value>part.max[index]))throw Error('Invalid authored center bounds: '+culture);
  result[culture]=template;
 }
 return result;
}

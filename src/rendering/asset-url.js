import manifest from '../../content/manifests/web-assets.json' with {type:'json'};
import audioManifest from '../../content/manifests/audio-runtime.json' with {type:'json'};
import sfxManifest from '../../content/manifests/sfx-runtime.json' with {type:'json'};
import imageManifest from '../../content/manifests/image-runtime.json' with {type:'json'};
import {runtimeGeometryManifest,cropRuntimeDescriptor} from './crop-runtime.js';
const runtimeManifest=runtimeGeometryManifest(manifest);
const variants=new Map([...runtimeManifest.records,...audioManifest.records,...sfxManifest.records,...imageManifest.records].map(item=>[item.source,item.runtime]));
for(const record of cropRuntimeDescriptor.replaced){const collection=cropRuntimeDescriptor.collections[record.kind].slice(1);variants.set(record.source,collection);variants.set(record.runtime,collection);}
const expectedSizes=new Map([...runtimeManifest.records,...audioManifest.records,...sfxManifest.records,...imageManifest.records].map(item=>[item.runtime,item.afterBytes]));
for(const record of cropRuntimeDescriptor.runtimeAssets)expectedSizes.set(record.path,record.bytes);
// Reuses the shipped manifest already needed for aliases; never probes assets
// with a HEAD or a second fetch to estimate pending transfer size.
export function assetExpectedBytes(url){try{const path=new URL(url,globalThis.location?.href??'http://localhost/').pathname,index=path.lastIndexOf('/assets/');return index<0?null:expectedSizes.get(path.slice(index+1))??null;}catch{return null;}}
export function assetUrl(url) {
  if(typeof url!=='string'||!/^\/?(?:assets|content|menu|selector|library)(?:\/|\.html)/.test(url))return url;
  const path=url.replace(/^\//,'');
  if(typeof document==='undefined')return '/'+(variants.get(path)??path);
  const base=new URL(import.meta.env?.DEV?'../../':'../',import.meta.url);
  return new URL(variants.get(path)??path,base).href;
}
export function resolveAssetValues(value){
  if(typeof value==='string')return assetUrl(value);
  if(Array.isArray(value))return value.map(resolveAssetValues);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolveAssetValues(item)]));
  return value;
}

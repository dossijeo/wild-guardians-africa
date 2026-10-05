import manifest from '../../content/manifests/web-assets.json' with {type:'json'};
import audioManifest from '../../content/manifests/audio-runtime.json' with {type:'json'};
const variants=new Map([...manifest.records,...audioManifest.records].map(item=>[item.source,item.runtime]));
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

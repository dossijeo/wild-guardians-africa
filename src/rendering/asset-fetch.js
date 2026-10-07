import {assetUrl,resolveAssetValues} from './asset-url.js';

const fetchAsset=(url,options)=>options===undefined?fetch(assetUrl(url)):fetch(assetUrl(url),options);
export const json=async (url,options)=>{const response=await fetchAsset(url,options);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);return resolveAssetValues(await response.json());};
export const bytes=async (url,options)=>{const response=await fetchAsset(url,options);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);return response.arrayBuffer();};

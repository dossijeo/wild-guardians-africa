import {assetUrl,resolveAssetValues} from './asset-url.js';
import {beginAssetTransfer,readAssetBody,finishAssetTransfer} from './asset-transfer.js';
const fetchAsset=(url,options)=>options===undefined?fetch(assetUrl(url)):fetch(assetUrl(url),options);
async function read(url,options,type){const token=beginAssetTransfer(assetUrl(url));try{const response=await fetchAsset(url,options);if(!response.ok)throw new Error(`No se pudo cargar ${url}`);const value=await readAssetBody(response,type,token);finishAssetTransfer(token,{loaded:type==='arrayBuffer'?value.byteLength:null});return value;}catch(error){finishAssetTransfer(token,{failed:true});throw error;}}
export const json=async (url,options)=>resolveAssetValues(await read(url,options,'json'));
export const bytes=(url,options)=>read(url,options,'arrayBuffer');

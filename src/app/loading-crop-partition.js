import descriptor from '../../content/manifests/crop-partition-runtime.json' with {type:'json'};
import {assetUrl} from '../rendering/asset-url.js';

export const loadingCropPartitionEnabled=()=>true;
// Integration candidate: one canonical Assets owner spans transition and World.
export async function prepareLoadingCropPartition(world,transfers,{scope=globalThis,url=descriptor.manifest,manifestBytes=descriptor.manifestBytes}={}){
 if(['__desktopSmokeWallBufferPackage','__desktopSmokeCompileWindow','__desktopSmokeResourceOverlap','__desktopSmokeSerialImageChain'].some(flag=>scope[flag]===true))throw Error('Crop partition recipe must remain isolated');
 if(world.cropPartition)throw Error('Crop partition already prepared');
 const downloads=transfers.downloads,previous=downloads.expectedBytes,resolved=new URL(assetUrl(url),globalThis.location?.href??'http://localhost/').href;
 let partition=null,closed=false;
 const expected=function(value){return value===resolved?manifestBytes:partition?.expectedBytes(value)??previous.call(this,value);};
 const close=()=>{if(closed)return;closed=true;world.loading.signal.removeEventListener('abort',close);if(downloads.expectedBytes===expected)downloads.expectedBytes=previous;if(world.cropPartition===partition)world.cropPartition=null;partition?.dispose();partition=null;};
 downloads.expectedBytes=expected;world.loading.signal.addEventListener('abort',close,{once:true});
 try{
  if(world.disposed||world.loading.signal.aborted)throw Error('Crop partition preparation cancelled');
  const loaded=await world.assets.getCropPartition();
  if(closed||world.disposed||world.loading.signal.aborted){loaded.dispose();throw Error('Crop partition preparation cancelled');}
  partition=loaded;world.cropPartition=partition;return partition;
 }catch(error){close();throw error;}
}

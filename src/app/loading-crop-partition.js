// One canonical Assets collection spans presentation and the complete World.
// Transfer sizes are published in asset-url before this first manifest request.
export async function prepareLoadingCropPartition(world){
 if(world.cropPartition)throw Error('Crop partition already prepared');
 let partition=null,closed=false;
 const close=()=>{if(closed)return;closed=true;world.loading.signal.removeEventListener('abort',close);if(world.cropPartition===partition)world.cropPartition=null;partition?.dispose();partition=null;};
 world.loading.signal.addEventListener('abort',close,{once:true});
 try{
  if(world.disposed||world.loading.signal.aborted)throw Error('Crop partition preparation cancelled');
  const loaded=await world.assets.getCropPartition();
  if(closed||world.disposed||world.loading.signal.aborted){loaded.dispose();throw Error('Crop partition preparation cancelled');}
  partition=loaded;world.cropPartition=partition;return partition;
 }catch(error){close();throw error;}
}

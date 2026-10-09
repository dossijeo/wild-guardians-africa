import {SharedNativePreparation} from './shared-native-preparation.js';
import {prepareNativeFarGpu} from './prepare-native-far-gpu.js';

const owners=new WeakMap();
export function prepareSharedNativeWorld(world,textures,cancelled){
 let owner=owners.get(world);
 if(!owner){
  owner=new SharedNativePreparation((required,allCancelled)=>prepareNativeFarGpu(
   world.renderer,world.assetGroups.root,world.scene,world.camera,required,
   {cancelled:()=>world.disposed||allCancelled(),diagnoseErrors:world.farGpuDiagnostics===true,
    isolateRoot:world.farIsolatedPreparation===true,zeroVertices:world.farZeroVertexPreparation===true,ownedCompilation:world.farOwnedCompilation===true,
    ownedWaits:world.farOwnedWaits===true,measureDraw:world.onLoadingGpuDraw}));
  owners.set(world,owner);
 }
 return owner.request(textures,cancelled);
}

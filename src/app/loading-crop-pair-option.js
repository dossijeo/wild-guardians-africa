// Rust exposes this flag only inside the existing --smoke-report guard.
export function applyLoadingCropPairOverlap(owner,scope=globalThis){
 if(scope.__desktopSmokeCropPairOverlap===true)owner.loadingCropPairOverlap=true;
}

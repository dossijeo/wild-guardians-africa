// Both sources stay owned by Assets. Join before World clones or adopts crops.
// Promise.all observes both failures immediately; it adds no timer or frame.
export async function loadWorldCropPair(loadSteady,loadBridges){
 const steady=Promise.resolve().then(loadSteady),bridges=Promise.resolve().then(loadBridges);
 const [gltf,data]=await Promise.all([steady,bridges]);
 return {gltf,data};
}

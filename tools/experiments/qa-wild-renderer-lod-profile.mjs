// Diagnostic timers only; never use instrumented cadence as performance evidence.
export async function installLodProfile(page){
 await page.route('**/src/rendering/asset-lod.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const replace=(from,to)=>{if(!body.includes(from))throw Error('LOD profile anchor missing: '+from);body=body.replace(from,to);};
  replace('export function updateAssetLods(chunks,camera,quality){',`export function updateAssetLods(chunks,camera,quality){
   const profile=globalThis.qaLodProfile={totalMs:0,binsMs:0,matricesMs:0,coverageShadowMs:0,batches:0,selectedBatches:0,matrices:0},started=performance.now();`);
  replace('if(batch.key!==key){','profile.batches++;if(batch.key!==key){profile.selectedBatches++;');
  replace('const bins=nativeLodBins(', 'const binStart=performance.now();const bins=nativeLodBins(');
  replace('batch.meshes.length);', 'batch.meshes.length);profile.binsMs+=performance.now()-binStart;');
  replace('dummy??=new THREE.Object3D();','const matrixStart=performance.now();profile.matrices+=order.length;dummy??=new THREE.Object3D();');
  replace('mesh.count=order.length;', 'profile.matricesMs+=performance.now()-matrixStart;mesh.count=order.length;');
  replace('packLodCoverage(batch);updateAssetShadow(batch);batch.key=key;', 'const tailStart=performance.now();packLodCoverage(batch);updateAssetShadow(batch);profile.coverageShadowMs+=performance.now()-tailStart;batch.key=key;');
  replace('return stats;', 'profile.totalMs=performance.now()-started;return stats;');
  await route.fulfill({response,body});
 });
}

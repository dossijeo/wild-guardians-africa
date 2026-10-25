// Diagnostic only: retain one native chunk while allowing its meshes to evict.
// This intentionally does not define a production residency policy.
export async function installNativeResidencyProbe(page,key){
  if(!/^-?\d+,-?\d+$/.test(key))throw Error('Invalid native residency probe key');
  await page.route('**/src/world/wild-engine/spatial-chunk-stream.js*',async route=>{
    const response=await route.fetch();let source=await response.text();
    const replace=(anchor,value)=>{
      if(source.split(anchor).length!==2)throw Error('Native residency probe anchor changed');
      source=source.replace(anchor,value);
    };
    replace('stream.releaseChunk=(cx,cz)=>core.removeChunk(cx,cz);',
      `const probe=globalThis.qaNativeResidency={key:${JSON.stringify(key)},retainedEvictions:0};
      const release=(cx,cz)=>{if(cx+','+cz===probe.key){probe.retainedEvictions++;return false;}return true;};
      stream.releaseChunk=(cx,cz)=>release(cx,cz)?core.removeChunk(cx,cz):0;`);
    replace('stream.releaseChunks=coordinates=>core.removeChunks(coordinates);',
      'stream.releaseChunks=coordinates=>core.removeChunks(coordinates.filter(([cx,cz])=>release(cx,cz)));');
    await route.fulfill({response,body:source});
  });
}

// QA-only source instrumentation; never imported by the game.
export async function installTerrainPhaseTrace(page){
  await page.route('**/src/rendering/prepare-terrain-chunk.js*',async route=>{
    const response=await route.fetch();let body=await response.text();
    const start='const completedPhase=phase,start=now();';
    const end='lastFinished=finished;cpuMs+=ms;';
    for(const anchor of [start,end])if(body.split(anchor).length!==2)throw Error('Terrain trace anchor changed: '+anchor);
    body=body.replace(start,'const estimateBefore=costs.get(costKey())??.25;'+start)
      .replace(end,end+"const trace=globalThis.qaTerrainPhaseTrace??=[];if(trace.length<10000)trace.push({cx:data.cx,cz:data.cz,phase:completedPhase,estimateBefore,ms,waitMs,at:finished});");
    await route.fulfill({response,body});
  });
  await page.route('**/src/rendering/natural-water-edges.js*',async route=>{
    const response=await route.fetch();let body=await response.text();
    const anchor='export function prepareNaturalAssetWater(world,mesh,cx,cz){';
    if(body.split(anchor).length!==2)throw Error('Asset water trace anchor changed');
    body=body.replace(anchor,'function tracedNaturalAssetWater(world,mesh,cx,cz){');
    body+="\nexport function prepareNaturalAssetWater(world,mesh,cx,cz){const start=performance.now();try{return tracedNaturalAssetWater(world,mesh,cx,cz);}finally{const trace=globalThis.qaTerrainPhaseTrace??=[];if(trace.length<10000)trace.push({phase:'asset-water',cx,cz,ms:performance.now()-start,at:performance.now(),bed:mesh.userData.naturalWaterBed});}}\n";
    await route.fulfill({response,body});
  });
}

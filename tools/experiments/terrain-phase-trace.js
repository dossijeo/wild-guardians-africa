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
}

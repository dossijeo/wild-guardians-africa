import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
export async function installRiverGroundWearRoute(page,enabled){
 await installRiverCoverPaletteRoute(page,true);
 if(!enabled)return;
 await page.route('**/src/rendering/biome-material-source.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const changes=[
   ['cover*=1.-wear*.91;','cover*=river?1.-smoothstep(.08,.30,wear):1.-wear*.91;'],
   ['float reliefMask=canyon?canyonFlat:up;','float reliefMask=canyon?canyonFlat:up;if(river)reliefMask*=1.-smoothstep(.08,.30,wear);']
  ];
  for(const [a,b]of changes){if(!body.includes(a))throw Error('Ground wear anchor missing: '+a);body=body.replace(a,b);}
  await route.fulfill({response,body});
 });
}

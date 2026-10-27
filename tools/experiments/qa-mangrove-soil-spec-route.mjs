import {installMangroveHeightBlendRoute} from './qa-mangrove-height-blend-route.mjs';
export async function installMangroveSoilSpecRoute(page,enabled){
 await installMangroveHeightBlendRoute(page,{height:true,calibrated:true});
 if(enabled)await page.route('**/src/rendering/african-toon.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='float biomeAO=nativeContact4(vToonWorld)*materialAO410;';if(!body.includes(anchor))throw Error('Ground spec anchor missing');body=body.replace(anchor,'if(uBiome>1.5&&uBiome<2.5)biomeSpec*=materialCover410;'+anchor);await route.fulfill({response,body});});
}

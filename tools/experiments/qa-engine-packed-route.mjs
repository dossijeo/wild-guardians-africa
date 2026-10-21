export async function installEnginePackedRoute(page){
 await page.route('**/src/world/wild-engine/spatial-savanna-payload.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='groundMask,instances:spatialInstances(wasm,cx,cz)};';
  if(!body.includes(anchor))throw Error('Engine payload capture anchor missing');
  body="import {capturePackedProps} from '../../rendering/wild-renderer/packed-props.js';\n"+body.replace(anchor,
   'groundMask,instances:Object.assign(spatialInstances(wasm,cx,cz),{qaPacked:capturePackedProps(wasm,cx,cz)})};');
  await route.fulfill({response,body});
 });
}

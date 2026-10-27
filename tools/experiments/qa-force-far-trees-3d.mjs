// QA only: prepare all native replacements through the existing standby path,
// then suppress cards persistently in the adapter update. Readiness must be
// audited before screenshots; unlike production this reference cannot fall back.
export async function forceFarTrees3D(context,{matchDensity=false}={}){
 await context.route('**/tools/experiments/attach-native-far-world.js*',async route=>{
  const response=await route.fetch();let source=await response.text();
  const visibility='layer.current.prototype.impostors.visible=this.enabled;';
  if(!source.includes(visibility))throw Error('Missing persistent card visibility hook');
  source=source.replace(visibility,'layer.current.prototype.impostors.visible=false;');
  if(matchDensity){
   const target='return ref?.batch.fade?.attribute.getX(ref.index)??1;';
   if(!source.includes(target))throw Error('Missing standby density hook');
   source="import {qaFarDensity} from './qa-far-density.mjs';\n"+source.replace(target,'return (ref?.batch.fade?.attribute.getX(ref.index)??1)*qaFarDensity(layer.current,world.camera.position,id);').replace('new NativeTreeStandby({angularLod,','new NativeTreeStandby({maxTrees:8192,angularLod,');
  }
  await route.fulfill({response,body:source});
 });
 await context.route('**/tools/experiments/far-impostor-math.js*',async route=>{const response=await route.fetch(),source=await response.text(),target='export function horizonCardWeight(horizontal,vertical){';if(!source.includes(target))throw Error('Missing horizon policy');await route.fulfill({response,body:source.replace(target,target+'return 0;')});});
 // Do not multiply the card shader angular factor by zero: in vMix=1-ready*(1-fade*factor)
 // that would force vMix=1 and show the cards, exactly the opposite of this test.
}

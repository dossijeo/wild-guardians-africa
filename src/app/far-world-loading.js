import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';

// Prepare the first regional representation beneath the existing loading screen.
// render(0) uploads resources without advancing the gameplay clock.
export async function prepareInitialFarWorld(world,{nextFrame,now=()=>performance.now(),timeout=90000,afterRender=()=>{}}={}){
 const owner=world.farVegetation;if(!owner)return;
 const started=now(),signal=world.loading.signal;
 const checkOwner=()=>{if(world.disposed||signal.aborted||world.farVegetation!==owner)throw Error('Far world loading cancelled');};
 const check=()=>{checkOwner();if(now()-started>=timeout)throw Error('Far world preparation timed out');};
 const frame=()=>waitGpuFrame({check,nextFrame,signal});
 for(;;){
  checkOwner();
  if(world.renderLoadingFrame)await world.renderLoadingFrame({nextFrame:frame,afterRender});else world.render(0);afterRender();
  const adapters=owner.adapters??[];
  const errors=adapters.flatMap(adapter=>adapter.stats.errors);
  if(errors.length)throw Error('Far world preparation failed: '+errors[0]);
  if(adapters.length&&adapters.every(adapter=>adapter.layer.current))return;
  if(now()-started>=timeout)throw Error('Far world preparation timed out');
  await frame();
 }
}

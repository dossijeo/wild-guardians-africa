// Prepare the first regional representation beneath the existing loading screen.
// render(0) uploads resources without advancing the gameplay clock.
export async function prepareInitialFarWorld(world,{nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),now=()=>performance.now(),timeout=90000,afterRender=()=>{}}={}){
 const owner=world.farVegetation;if(!owner)return;
 const started=now();
 for(;;){
  if(world.disposed||world.loading.signal.aborted||world.farVegetation!==owner)throw Error('Far world loading cancelled');
  if(world.renderLoadingFrame)await world.renderLoadingFrame({nextFrame,afterRender});else world.render(0);afterRender();
  const adapters=owner.adapters??[];
  const errors=adapters.flatMap(adapter=>adapter.stats.errors);
  if(errors.length)throw Error('Far world preparation failed: '+errors[0]);
  if(adapters.length&&adapters.every(adapter=>adapter.layer.current))return;
  if(now()-started>=timeout)throw Error('Far world preparation timed out');
  await nextFrame();
 }
}

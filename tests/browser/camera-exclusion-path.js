// Reproducible diagnostic input through the pinned native OrbitControls. This
// is an authored QA route, not proof of pointer/touch handling or FPS.
export async function runCameraExclusionPath(world,{frame=()=>new Promise(resolve=>requestAnimationFrame(resolve))}={}){
 if(!world.cameraExclusion)throw Error('Activa la protección de cámara antes del recorrido');
 const controls=world.controls,center=world.state.structures.find(s=>s.kind==='center'),snapshot=JSON.stringify(world.state),samples=[];
 const damping=controls.enableDamping;controls.enableDamping=false;
 const sample=(stage,step)=>{
  const {registry,motion}=world.cameraExclusion,eye=world.camera.position.toArray(),ground=world.nav.field.surface(eye[0],eye[2]);
  samples.push({stage,step,eye,target:controls.target.toArray(),theta:controls.getAzimuthalAngle(),phi:controls.getPolarAngle(),altitude:eye[1]-ground,overlap:registry.index.sweep(eye,eye,motion.radius)?.id??null,motion:{...motion.stats}});
 };
 const step=async(stage,i,input)=>{await frame();input();controls.update();world.render(0);sample(stage,i);};
 try{
  world.focus({x:center.x,z:center.z,distance:38});controls.update();world.render(0);sample('focus',0);
  for(let i=0;i<24;i++)await step('ascend',i,()=>controls._rotateUp((controls.getPolarAngle()-.15)/(24-i)));
  for(let i=0;i<64;i++)await step('roof-orbit',i,()=>controls._rotateLeft(2*Math.PI/64));
  for(let i=0;i<32;i++)await step('descend',i,()=>controls._rotateUp((controls.getPolarAngle()-1.35)/(32-i)));
  await step('zoom',0,()=>controls._dollyIn(.7));
  for(let i=0;i<64;i++)await step('close-orbit',i,()=>controls._rotateLeft(2*Math.PI/64));
  for(let i=0;i<32;i++)await step('return-above',i,()=>controls._rotateUp((controls.getPolarAngle()-.15)/(32-i)));
  return {schema:1,biome:world.state.biome,culture:world.state.culture,center: center.id,margins:{center:world.cameraExclusion.registry.centerMargin,village:world.cameraExclusion.registry.villageMargin},simulationUnchanged:snapshot===JSON.stringify(world.state),samples,overlaps:samples.filter(s=>s.overlap).length,unresolved:samples.filter(s=>s.motion.unresolved).length,terrainConflicts:samples.filter(s=>s.motion.terrainConflict||s.altitude<2-1e-8||s.altitude>20+1e-8).length,limits:'Authored OrbitControls deltas, not pointer/touch input, frame time, mobile hardware or complete visual acceptance.'};
 }finally{controls.enableDamping=damping;}
}

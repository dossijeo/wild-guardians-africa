export async function focusWater(world){
 const f=world.nav.field,target=world.controls.target;let x,z,level;
 if(f.riverActive){z=target.z;x=f.riverX(z);level=f.waterInfo(x,z).level;}
 else{let best=Infinity;for(let dz=-48;dz<=48;dz+=2)for(let dx=-48;dx<=48;dx+=2){const px=target.x+dx,pz=target.z+dz,w=f.waterInfo(px,pz);if(w.inside&&dx*dx+dz*dz<best){best=dx*dx+dz*dz;x=px;z=pz;level=w.level}}}
 if(!Number.isFinite(level))throw Error('No water found for visual QA view');
 world.controls.target.set(x,level,z);world.camera.position.set(x+9,level+13,z+18);
 world.updateCamera=()=>{world.camera.lookAt(world.controls.target);world.camera.updateMatrixWorld()};
 world.syncChunks();await world.whenChunksReady();world.render(.016);
 return {position:world.camera.position.toArray(),target:world.controls.target.toArray(),river:!!f.riverActive,level};
}

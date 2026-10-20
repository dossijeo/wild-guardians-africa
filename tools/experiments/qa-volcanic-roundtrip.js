import {updateObstructions} from '/src/rendering/obstruction.js';

// Visual-only streaming path; does not move any simulated entity.
export async function volcanicRoundtrip(w){
 const target=w.controls.target.clone(),camera=w.camera.position.clone(),render=w.render;
 const draw=w.qaManualRender??render;w.render=()=>{};
 const rows=[];
 try{
  const home=target.toArray();
  for(const [index,[dx,dz]]of [[0,0],[192,0],[192,192],[0,192],[0,0]].entries()){
   w.controls.target.set(home[0]+dx,w.nav.field.surface(home[0]+dx,home[2]+dz)+.9,home[2]+dz);
   w.camera.position.copy(w.controls.target).add({x:22,y:16,z:18});
   w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();
   w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();
   for(let i=0;i<16;i++)draw.call(w,1/30);
   updateObstructions(w.chunks,w.camera,w.controls.target,0,{enabled:w.obstructionEnabled!==false,snap:true});
   draw.call(w,1/30);
   rows.push({index,offset:[dx,dz],camera:w.camera.position.toArray(),target:w.controls.target.toArray(),origin:{...w.renderOrigin},chunks:[...w.chunks.keys()].sort(),memory:{...w.renderer.info.memory},programs:w.renderer.info.programs.length,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,glError:w.renderer.getContext().getError(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});
  }
  return rows;
 }finally{w.controls.target.copy(target);w.camera.position.copy(camera);w.render=render;}
}

import {updateObstructions} from '/src/rendering/obstruction.js';
export async function sandRoundtrip(w){
 const draw=w.render,rows=[],home=[w.controls.target.x,w.controls.target.z];w.render=()=>{};
 try{
 for(const [index,[dx,dz]] of [[0,0],[192,0],[192,192],[0,192],[0,0],[-192,0],[-192,-192],[0,-192],[0,0]].entries()){
  const x=home[0]+dx,z=home[1]+dz;
  w.controls.target.set(x,w.nav.field.surface(x,z)+.9,z);w.camera.position.copy(w.controls.target).add({x:6,y:34,z:6});
  w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();const started=performance.now();
  w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();
  for(let i=0;i<16;i++)draw.call(w,1/30);
  updateObstructions(w.chunks,w.camera,w.controls.target,0,{enabled:w.obstructionEnabled!==false,snap:true});draw.call(w,1/30);
  const glError=w.renderer.getContext().getError();if(glError)throw Error('GL error');
  rows.push({index,offset:[dx,dz],worldTarget:[w.controls.target.x,w.controls.target.z],camera:w.camera.position.toArray(),target:w.controls.target.toArray(),origin:{...w.renderOrigin},chunks:[...w.chunks.keys()].sort(),memory:{...w.renderer.info.memory},programs:w.renderer.info.programs.length,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,settleMs:performance.now()-started,glError,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});
 }
 return rows;
 }finally{w.render=draw;}
}

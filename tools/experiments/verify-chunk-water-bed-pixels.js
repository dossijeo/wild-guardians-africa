// QA only: synchronous readback after performance recording, no time advancement.
import {prepareNaturalWaterBed,prepareNaturalWaterBedIncremental} from '/src/rendering/natural-water-edges.js';
export function verifyChunkWaterBedPixels(w,key){
 const group=w.chunks.get(key);let mesh;group?.traverse(o=>{if(!mesh&&o.userData.nativeFluid==='chunk'&&o.geometry.userData.naturalWaterBed)mesh=o;});
 if(!mesh)throw Error('Missing resident water '+key);
 const r=w.renderer,gl=r.getContext(),target=r.getRenderTarget(),visible=mesh.visible,[cx,cz]=key.split(',').map(Number);
 let texture,saved;
 const read=()=>{r.render(w.scene,w.camera);const b=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);if(gl.getError()!==gl.NO_ERROR)throw Error('Water pixel readback GL error');return b;};
 const diff=(a,b)=>{let changedChannels=0,maxDelta=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d){changedChannels++;maxDelta=Math.max(maxDelta,d);}}return {changedChannels,maxDelta};};
 try{
  r.setRenderTarget(null);read();
  texture=r.properties.get(mesh.material).uniforms?.qaBed?.value;
  if(!texture?.image?.data)throw Error('Missing compiled water-bed texture');
  saved=texture.image.data.slice();
  const original=prepareNaturalWaterBed(w,mesh.geometry,cx,cz,{yielding:false}).next().value;
  const steps=prepareNaturalWaterBedIncremental(w,mesh.geometry,cx,cz);let step;try{while(!(step=steps.next()).done){}}finally{steps.return();}const candidate=step.value;
  for(const name of ['nx','nz','minX','minZ','width','height','lo','span'])if(original[name]!==candidate[name])throw Error('Bed metadata mismatch '+name);
  if(original.bytes.length!==saved.length||candidate.bytes.length!==saved.length)throw Error('Bed texture size mismatch');
  const set=b=>{texture.image.data.set(b);texture.needsUpdate=true;};
  set(original.bytes);read();const a1=read();const a2=read();
  set(candidate.bytes);read();const b=read();
  mesh.visible=false;const hidden=read();
  const result={key,pixels:a1.length/4,repeat:diff(a1,a2),comparison:diff(a2,b),visibilityWitness:diff(b,hidden),scope:'Same frozen renderer scene, camera and uniforms; only uploaded bed bytes change. Main color rendering, not postprocess or performance acceptance.'};
  if(result.repeat.changedChannels||result.comparison.changedChannels)throw Error('Water pixel equivalence failed '+JSON.stringify(result));
  if(!result.visibilityWitness.changedChannels)throw Error('Water visibility witness is empty '+JSON.stringify(result));
  return result;
 }finally{mesh.visible=visible;if(texture&&saved){texture.image.data.set(saved);texture.needsUpdate=true;}r.setRenderTarget(target);}
}

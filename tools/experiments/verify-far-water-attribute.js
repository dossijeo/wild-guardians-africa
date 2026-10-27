// QA only. Run after performance recording stops: readPixels is synchronous.
// Compare the real scene/shaders without advancing simulation, wind or camera.
export function verifyFarWaterAttribute(world){
 const renderer=world.renderer,gl=renderer.getContext(),meshes=[];
 world.scene.traverse(o=>{if(o.userData?.farGround&&o.geometry?.attributes.aFarWater)meshes.push(o);});
 if(!meshes.length)throw Error('No far ground to validate');
 const saved=meshes.map(mesh=>({mesh,visible:mesh.visible,data:mesh.geometry.attributes.aFarWater.array.slice()}));
 const target=renderer.getRenderTarget(),size=gl.drawingBufferWidth*gl.drawingBufferHeight*4;
 const read=()=>{renderer.render(world.scene,world.camera);const bytes=new Uint8Array(size);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);if(gl.getError()!==gl.NO_ERROR)throw Error('Readback GL error');return bytes;};
 const difference=(a,b)=>{let count=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d){count++;max=Math.max(max,d);}}return {changedChannels:count,maxDelta:max};};
 const set=value=>{for(const {mesh}of saved){mesh.geometry.attributes.aFarWater.array.fill(value);mesh.geometry.attributes.aFarWater.needsUpdate=true;}};
 try{
  renderer.setRenderTarget(null);read();const original=read();
  set(0);const zero=read();set(1);const one=read();
  for(const {mesh}of saved)mesh.visible=false;const hidden=read();
  const result={meshes:meshes.length,vertices:saved.reduce((n,s)=>n+s.data.length,0),zero:difference(original,zero),one:difference(original,one),visibilityWitness:difference(one,hidden)};
  if(result.zero.changedChannels||result.one.changedChannels)throw Error('Far vertex water affects rendered image: '+JSON.stringify(result));
  if(!result.visibilityWitness.changedChannels)throw Error('Far ground not visible: vacuous comparison');
  return result;
 }finally{for(const {mesh,visible,data}of saved){mesh.visible=visible;mesh.geometry.attributes.aFarWater.array.set(data);mesh.geometry.attributes.aFarWater.needsUpdate=true;}renderer.setRenderTarget(target);}
}

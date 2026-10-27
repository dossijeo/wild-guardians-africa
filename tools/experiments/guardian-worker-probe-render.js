import {GuardianMesh,GuardianMagic} from '/src/ui/guardian-native.js';
export function renderGuardianProbe(canvas,magicCanvas,image,poses){
 const start=performance.now(),mesh=new GuardianMesh(canvas,image),magic=new GuardianMagic(magicCanvas),setupMs=performance.now()-start;
 try{
  if(!mesh.gl)throw Error('Probe requires native WebGL rendering');
  const results=[];
  for(const {pose,time} of poses){mesh.update(pose.roll,pose.yaw,pose.pitch,pose);mesh.draw();magic.draw(mesh,time,pose,false);
   const pixels=new Uint8Array(canvas.width*canvas.height*4);mesh.gl.readPixels(0,0,canvas.width,canvas.height,mesh.gl.RGBA,mesh.gl.UNSIGNED_BYTE,pixels);
   results.push({pixels,magic:magic.ctx.getImageData(0,0,magicCanvas.width,magicCanvas.height).data,positions:mesh.positions.slice()});
  }
  return {setupMs,width:canvas.width,height:canvas.height,results};
 }finally{mesh.gl?.getExtension('WEBGL_lose_context')?.loseContext();}
}

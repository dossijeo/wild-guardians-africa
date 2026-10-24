import {GuardianMesh,GuardianMagic} from './guardian-native.js';
let mesh,magic,bitmap,size;
const fail=error=>self.postMessage({type:'error',message:error.message??String(error)});
self.onmessage=({data})=>{
 try{
  if(data.type==='init'){
   bitmap=data.bitmap;size=data.size;const {canvas,magicCanvas}=data;
   // The generated renderer's mesh/shaders stay unchanged. Override only DOM
   // sizing. A lost context abandons this executor and uses the main fallback.
   canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();event.stopImmediatePropagation();fail(Error('Guardian worker context lost'));});
   class WorkerMesh extends GuardianMesh {resize(){this.dirty=true;const dpr=Math.min(size.dpr,this.gl?2:1.25);this.canvas.width=Math.max(2,Math.round(size.width*dpr));this.canvas.height=Math.max(2,Math.round(size.height*dpr));if(this.gl&&!this.lost)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}}
   class WorkerMagic extends GuardianMagic {resize(){const width=size.magicWidth||300,dpr=Math.min(size.dpr,2);this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(width*dpr);}}
   const start=performance.now();mesh=new WorkerMesh(canvas,bitmap);magic=new WorkerMagic(magicCanvas);
   if(!mesh.gl)throw Error('Guardian worker WebGL unavailable');
   self.postMessage({type:'ready',setupMs:performance.now()-start});
  }else if(data.type==='frame'){
   if(!mesh||!magic)throw Error('Guardian worker not initialized');
   const next=data.size;if(Object.keys(next).some(key=>next[key]!==size[key])){size=next;mesh.resize();magic.resize();}
   const {pose,time}=data;mesh.update(pose.roll,pose.yaw,pose.pitch,pose);mesh.draw();magic.draw(mesh,time,pose,false);
   self.postMessage({type:'frame',sequence:data.sequence});
  }
 }catch(error){bitmap?.close();bitmap=null;fail(error);}
};

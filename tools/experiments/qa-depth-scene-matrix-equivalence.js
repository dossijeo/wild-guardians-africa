import {Vector3} from 'three';
import {installDepthSceneMatrixReuse} from './reuse-depth-scene-matrices.js';
export function compareDepthSceneMatrices(w){
 const r=w.renderer,gl=r.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
 const fx=w.vfxLibrary.create('dust',w.destructionPass,{stepMode:true}),key='qa-visible-depth';
 w.scene.add(fx);w.locomotionVfx.effects.set(key,fx);fx.seek(.4);
 const others=[...w.vfxLibrary.instances].filter(x=>x!==fx).map(x=>({x,visible:x.visible,soft:x.softParticleDepth}));for(const {x} of others){x.visible=false;x.softParticleDepth=false;}
 const center=w.controls.target.clone(),right=new Vector3().setFromMatrixColumn(w.camera.matrixWorld,0),rows=[];
 function sample(){w.drawWorldFrame();const bytes=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;}
 try{
  for(const offset of [0,1000,0,-1000]){
   fx.position.copy(center).addScaledVector(right,offset);fx.position.y+=.2;
   const control=sample();const a=sample(),finish=installDepthSceneMatrixReuse(w);let b,stats;
   try{b=sample();}finally{stats=finish();}
   const controlCoordinates=[],candidateCoordinates=[];let sameBackendChangedPixels=0;for(let i=0;i<a.length;i+=4)if(a[i]!==control[i]||a[i+1]!==control[i+1]||a[i+2]!==control[i+2]||a[i+3]!==control[i+3]){sameBackendChangedPixels++;if(controlCoordinates.length<64)controlCoordinates.push([i/4%width,Math.floor(i/4/width)]);}
   let changed=0,max=0;for(let i=0;i<a.length;i+=4){let diff=false;for(let k=0;k<4;k++){const d=Math.abs(a[i+k]-b[i+k]);max=Math.max(max,d);diff ||=d>0;}changed+=Number(diff);if(diff&&candidateCoordinates.length<64)candidateCoordinates.push([i/4%width,Math.floor(i/4/width)]);}
   let effectPixels=null;if(offset===0){fx.visible=false;const blank=sample();fx.visible=true;effectPixels=0;for(let i=0;i<a.length;i+=4)if(a[i]!==blank[i]||a[i+1]!==blank[i+1]||a[i+2]!==blank[i+2])effectPixels++;if(!effectPixels)throw Error('Empty visible effect control');}
   rows.push({offset,controlCoordinates,candidateCoordinates,sameBackendChangedPixels,effectPixels,changedPixels:changed,maxByteDifference:max,...stats});
  }
  if(!rows.every(x=>x.reused===1))throw Error('Expected paired matrix reuse '+JSON.stringify(rows));
  
  return rows;
 }finally{for(const {x,visible,soft} of others){x.visible=visible;x.softParticleDepth=soft;}w.locomotionVfx.effects.delete(key);fx.dispose();}
}

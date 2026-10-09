import {Vector4} from 'three';

// Synchronous screen submission only. Never retain renderer mutations while
// awaiting shader compilation, GPU fences, image decoding or a frame boundary.
export function withScreenTarget(renderer,submit){
 const target=renderer.getRenderTarget(),viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),test=renderer.getScissorTest();
 try{renderer.setRenderTarget(null);return submit();}
 finally{renderer.setRenderTarget(target);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);}
}

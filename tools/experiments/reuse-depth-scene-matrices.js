// QA-only: reuse scene matrices for the immediate color draw after depth.
// Scope ends before returning from drawWorldFrame, including exceptions.
export function installDepthSceneMatrixReuse(world){
 const renderer=world.renderer,depth=world.destructionPass;
 const originalRender=renderer.render,originalDepth=depth.captureDepth,originalDraw=world.drawWorldFrame;
 let transaction=false,inDepth=false,ready=null;
 const stats={reused:0};
 const capture=function(camera,scene){
  ready=null;inDepth=true;
  try{const result=originalDepth.call(this,camera,scene);if(transaction)ready={camera,scene};return result;}
  finally{inDepth=false;}
 };
 const render=function(scene,camera){
  const reuse=transaction&&!inDepth&&scene===world.scene&&ready?.scene===scene&&ready.camera===camera;
  if(!inDepth)ready=null;
  const automatic=scene.matrixWorldAutoUpdate;
  try{if(reuse&&automatic){scene.matrixWorldAutoUpdate=false;stats.reused++;}return originalRender.call(this,scene,camera);}
  finally{scene.matrixWorldAutoUpdate=automatic;}
 };
 const draw=function(...args){
  if(transaction)return originalDraw.apply(this,args);
  transaction=true;ready=null;
  try{return originalDraw.apply(this,args);}finally{transaction=false;ready=null;inDepth=false;}
 };
 renderer.render=render;depth.captureDepth=capture;world.drawWorldFrame=draw;
 return ()=>{if(renderer.render===render)renderer.render=originalRender;if(depth.captureDepth===capture)depth.captureDepth=originalDepth;if(world.drawWorldFrame===draw)world.drawWorldFrame=originalDraw;return stats;};
}

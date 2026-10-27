// Diagnostic only. Counts root synchronizations; never suppresses an update.
export function installOriginMatrixProbe(world,now=()=>performance.now()){
 const scene=world.scene,renderer=world.renderer;
 const originalUpdate=scene.updateMatrixWorld,originalRender=renderer.render,originalDraw=world.drawWorldFrame;
 const stats={draws:0,nonzeroOriginDraws:0,worldRenders:0,afterExplicitUpdate:0,staleLightPositions:0,rootCalls:{outside:0,preDraw:0,renderer:0,postDraw:0},rootMs:{outside:0,preDraw:0,renderer:0,postDraw:0}};
 let active=false,inRender=0,rendered=false,explicit=false;
 function update(...args){
  const phase=!active?'outside':inRender?'renderer':rendered?'postDraw':'preDraw',start=now();
  stats.rootCalls[phase]++;
  try{return originalUpdate.apply(this,args);}finally{stats.rootMs[phase]+=now()-start;if(active&&!inRender&&!rendered)explicit=true;}
 }
 function render(target,camera,...args){
  if(target!==scene||!active)return originalRender.call(this,target,camera,...args);
  stats.worldRenders++;if(explicit)stats.afterExplicitUpdate++;
  for(const light of world.vfxLibrary?.worldLights??[]){const e=light.matrix.elements,p=light.position;if(e[12]!==p.x||e[13]!==p.y||e[14]!==p.z)stats.staleLightPositions++;}
  inRender++;
  try{return originalRender.call(this,target,camera,...args);}finally{inRender--;rendered=true;}
 }
 function draw(...args){
  if(active)return originalDraw.apply(this,args);
  active=true;rendered=false;explicit=false;stats.draws++;if(world.renderOrigin.x||world.renderOrigin.z)stats.nonzeroOriginDraws++;
  try{return originalDraw.apply(this,args);}finally{active=false;rendered=false;explicit=false;}
 }
 scene.updateMatrixWorld=update;renderer.render=render;world.drawWorldFrame=draw;
 return ()=>{if(scene.updateMatrixWorld===update)scene.updateMatrixWorld=originalUpdate;if(renderer.render===render)renderer.render=originalRender;if(world.drawWorldFrame===draw)world.drawWorldFrame=originalDraw;return stats;};
}

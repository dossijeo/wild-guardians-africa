// QA only: observe actual submitted counters rather than estimating triangles
// from full geometry buffers (groups/drawRange/instancing can change the draw).
export function captureRenderSubmissions(world,render){
 const renderer=world.renderer,original=renderer.renderBufferDirect,autoReset=renderer.info.autoReset;
 const roots=new Map(),special=new Map(),rows=new Map(),objects=new Map();
 for(const [category,entities] of [['worker',world.state.workers],['crop',world.state.plants],['crate',world.state.crates],['village',world.state.villages],['spell',world.state.spells],['animal',world.state.raid?.animals??[]]])for(const e of entities)roots.set(e.id,category);
 for(const e of world.state.structures)roots.set(e.id,e.kind);
 for(const b of world.destructionPass.buildings)for(const mesh of [b.outer,b.inner,b.ash,b.opening])special.set(mesh,'center');
 const category=object=>{
  if(special.has(object))return special.get(object);
  if(object.geometry?.getAttribute('iGrowth'))return 'crop';
  if(object.userData.nativeMergedAsset)return 'biome-prop';
  if(object.material===world.fluidMaterial)return 'water';
  if(object.userData.ground||object.material?.userData.biomeGround)return 'ground';
  for(let parent=object;parent;parent=parent.parent){
   const known=roots.get(parent.userData.entityId);if(known)return known;
   if(parent===world.sky.scene)return 'sky';
   if(parent.name==='native_asset_shadow_pass')return 'biome-prop';
  }
  return 'unclassified';
 };
 const pass=()=>{
  const target=renderer.getRenderTarget();
  return target===world.sun.shadow.map?'shadow':target===world.destructionPass.smokeDepth?'world-depth':target===world.destructionPass.target?'building-mask':target===null?'screen':'other-target';
 };
 function draw(camera,scene,geometry,material,object,group){
  const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles,p=pass(),c=category(object);
  const value=original.call(this,camera,scene,geometry,material,object,group);
  const added=renderer.info.render.calls-calls,tris=renderer.info.render.triangles-triangles;
  if(added){
   const key=p+'|'+c,row=rows.get(key)??{pass:p,category:c,calls:0,triangles:0};row.calls+=added;row.triangles+=tris;rows.set(key,row);
   const objectKey=p+'|'+object.uuid,item=objects.get(objectKey)??{pass:p,category:c,name:object.name,type:object.type,materialType:material.type,side:material.side,skinned:!!object.isSkinnedMesh,instanced:!!object.isInstancedMesh,calls:0,triangles:0};item.calls+=added;item.triangles+=tris;objects.set(objectKey,item);
  }
  return value;
 }
 renderer.info.autoReset=false;renderer.info.reset();renderer.renderBufferDirect=draw;
 try{
  render();
  const totals={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  const measured=[...rows.values()];
  if(measured.reduce((n,r)=>n+r.calls,0)!==totals.calls||measured.reduce((n,r)=>n+r.triangles,0)!==totals.triangles)throw Error('Submission counters do not reconcile');
  return {totals,rows:measured.sort((a,b)=>b.calls-a.calls),objects:[...objects.values()].sort((a,b)=>b.calls-a.calls)};
 }finally{renderer.renderBufferDirect=original;renderer.info.autoReset=autoReset;}
}

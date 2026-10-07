// QA-only category control. Called after owner.update so freshly adopted banks
// are included. Never alter shared source materials or prepared row ownership.
export function setFarComponentIsolation(adapters,backdrop,mode='all',ownerEnabled=true,groundEnabled=true){
 if(!['all','no-sprites','no-standby','no-backdrop','no-ground'].includes(mode))throw Error('Invalid far component isolation');
 for(const adapter of adapters){
  const sprite=adapter.layer.current?.prototype.impostors;
  if(sprite?.material)sprite.material.visible=mode!=='no-sprites';
  for(const child of sprite?.children??[])if(child.userData?.farGround===true)child.visible=groundEnabled&&mode!=='no-ground';
  const roots=new Set(adapter.standbyDraws().map(draw=>draw.mesh.parent));
  for(const root of roots)if(root)root.visible=adapter.enabled!==false&&mode!=='no-standby';
 }
 if(backdrop)backdrop.visible=ownerEnabled&&mode!=='no-backdrop';
}

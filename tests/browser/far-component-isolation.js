// QA-only category control. Called after owner.update so freshly adopted banks
// are included. Never alter shared source materials or prepared row ownership.
export function setFarComponentIsolation(adapters,backdrop,mode='all'){
 if(!['all','no-sprites','no-standby','no-backdrop'].includes(mode))throw Error('Invalid far component isolation');
 for(const adapter of adapters){
  const sprite=adapter.layer.current?.prototype.impostors;
  if(sprite?.material)sprite.material.visible=mode!=='no-sprites';
  const roots=new Set(adapter.standbyDraws().map(draw=>draw.mesh.parent));
  for(const root of roots)if(root)root.visible=mode!=='no-standby';
 }
 if(backdrop)backdrop.visible=mode!=='no-backdrop';
}

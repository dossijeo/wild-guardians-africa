// A material-independent QA switch; mapped-water attributes are not a type tag.
export function setFarGroundVisibility(adapters,visible){
 let count=0;
 for(const adapter of adapters)for(const child of adapter.layer.current?.prototype.impostors.children??[])
  if(child.userData?.farGround===true){child.visible=visible;count++;}
 return count;
}

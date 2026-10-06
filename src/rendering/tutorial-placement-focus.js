// A tool can be selected while the introduction is still being read. Focus
// when its actual world guide appears, once per target, without fighting pans.
const focused=new WeakMap();
export function focusNewTutorialPlacement(world,config,force=false){
 if(!config)return false;
 const key=JSON.stringify([config.target,config.position]);
 if(!force&&focused.get(world)===key)return false;
 focused.set(world,key);
 world.focus({x:config.position[0],z:config.position[2]});
 return true;
}

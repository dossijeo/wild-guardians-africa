export function placeCamera(world,t){
 const a=[22,16,18],b=[12,5,18],c=[-18,9,22],u=t<.5?t*2:(t-.5)*2;
 const from=t<.5?a:b,to=t<.5?b:c,p=world.controls.target;
 const x=p.x+from[0]+(to[0]-from[0])*u,z=p.z+from[2]+(to[2]-from[2])*u;
 world.camera.position.set(x,Math.max(p.y+from[1]+(to[1]-from[1])*u,world.nav.field.surface(x,z)+1.2),z);
}

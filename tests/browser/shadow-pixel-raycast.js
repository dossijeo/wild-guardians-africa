import {Raycaster,Vector2} from 'three';
const ray=new Raycaster(),point=new Vector2();
export function traceShadowPixel(world,x,y,width,height){point.set((x+.5)/width*2-1,(y+.5)/height*2-1);ray.setFromCamera(point,world.camera);return ray.intersectObjects(world.scene.children,true).slice(0,4).map(h=>({name:h.object.name,type:h.object.type,parent:h.object.parent?.name??'',distance:h.distance,instanceId:h.instanceId??null}));}

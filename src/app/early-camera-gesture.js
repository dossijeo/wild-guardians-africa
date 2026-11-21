import {Plane,Raycaster,Vector2,Vector3} from 'three';

// The previous WebGL owner raycast its private terrain mesh during a two-finger
// wall gesture. The early Worker view has no main-thread mesh; pan on the
// camera target plane and let confirmed-terrain camera protection constrain it.
export function panEarlyCameraGesture(camera,controls,rect,previous,next){
 if(!camera?.isCamera||!controls?.target||!rect||![rect.left,rect.top,rect.width,rect.height,previous?.x,previous?.y,previous?.distance,next?.x,next?.y,next?.distance].every(Number.isFinite)||rect.width<=0||rect.height<=0||previous.distance<=0||next.distance<=0)throw TypeError('Invalid camera gesture');
 camera.updateMatrixWorld();const ray=new Raycaster(),cursor=new Vector2(),plane=new Plane(new Vector3(0,1,0),-controls.target.y),point=new Vector3();
 const at=p=>{ray.setFromCamera(cursor.set(2*(p.x-rect.left)/rect.width-1,1-2*(p.y-rect.top)/rect.height),camera);return ray.ray.intersectPlane(plane,point)?.clone()??null;};
 const a=at(previous),b=at(next);if(a&&b){const delta=a.sub(b);controls.target.add(delta);camera.position.add(delta);}
 const offset=camera.position.clone().sub(controls.target),distance=offset.length();if(distance>0){const target=Math.max(controls.minDistance,Math.min(controls.maxDistance,distance*previous.distance/Math.max(10,next.distance)));offset.multiplyScalar(target/distance);camera.position.copy(controls.target).add(offset);}return !!(a&&b);
}

import {Vector3,Vector2,Plane,Raycaster} from 'three';
const groundTypes=new Set(['dew','flower','weeds','ants','termites','burrow','pathleaves','web','grain','snake','thornseeds','fog','heat','fire']);
// Physics coordinates belong to a fixed world plane, captured once at spawn.
// Only the sprite quad rotates towards the camera; orbiting cannot move its center.
export class MicroeventSpace {
  constructor({unit=.045}={}){this.unit=unit;this.u=new Vector3();this.v=new Vector3();this.normal=new Vector3();this.plane=new Plane();this.point=new Vector3();this.hitPoint=new Vector3();this.ndc=new Vector2();this.local=new Vector2();this.raycaster=new Raycaster();this.hits=[];}
  begin(def,anchor,camera){
    this.anchor=anchor;this.def=def;this.grounded=groundTypes.has(def.id);camera.updateMatrixWorld();anchor.offsetX=0;anchor.offsetZ=0;
    if(def.anchor==='wood'){const yaw=anchor.entity.yaw??0,nx=Math.sin(yaw),nz=Math.cos(yaw),sign=(camera.position.x-anchor.entity.x)*nx+(camera.position.z-anchor.entity.z)*nz>=0?1:-1;anchor.offsetX=nx*sign*.75;anchor.offsetZ=nz*sign*.75;}
    this.u.setFromMatrixColumn(camera.matrixWorld,0);this.u.y=0;this.u.normalize();
    if(this.grounded)this.v.set(camera.position.x-anchor.entity.x,0,camera.position.z-anchor.entity.z).normalize();else this.v.set(0,-1,0);
    if(def.anchor==='wood'){const yaw=anchor.entity.yaw??0;this.u.set(Math.cos(yaw),0,-Math.sin(yaw));this.v.set(Math.sin(yaw),0,Math.cos(yaw));if(this.v.x*anchor.offsetX+this.v.z*anchor.offsetZ<0)this.v.negate();}
    this.v.addScaledVector(this.u,-this.v.dot(this.u)).normalize();
    this.normal.crossVectors(this.u,this.v).normalize();
    const ground=anchor.groundY??anchor.y-1.3,height=def.worldHeight??(this.grounded?Math.max(def.size,def.targetSprite?.size??0)*this.unit*.5+.08:['raincloud','storm','lightning','smoke'].includes(def.id)?4:2.2);
    anchor.y=ground+height;this.refresh();
  }
  origin(out=this.point){const a=this.anchor;return out.set(a.entity.x+(a.offsetX??0),a.y,a.entity.z+(a.offsetZ??0));}
  refresh(){this.origin(this.point);this.plane.setFromNormalAndCoplanarPoint(this.normal,this.point);}
  offset(x,y,phase=0,out=this.point){return out.copy(this.u).multiplyScalar(x*this.unit).addScaledVector(this.v,y*this.unit).addScaledVector(this.normal,this.grounded?0:Math.sin(phase)*.45);}
  worldPosition(p,out=this.point){this.offset(p.x,p.y,p.phase,out);out.add(this.origin(this.hitPoint));if(this.def.behavior.pull)out.y+=p.progress*this.unit*25;return out;}
  toLocal(clientX,clientY,rect,camera){this.refresh();this.ndc.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);this.raycaster.setFromCamera(this.ndc,camera);if(!this.raycaster.ray.intersectPlane(this.plane,this.point))return null;this.point.sub(this.origin(this.hitPoint));return this.local.set(this.point.dot(this.u)/this.unit,this.point.dot(this.v)/this.unit);}
  project(p,camera,rect,out={}){this.worldPosition(p,this.point).project(camera);out.x=rect.left+(this.point.x+1)*rect.width*.5;out.y=rect.top+(1-this.point.y)*rect.height*.5;out.z=this.point.z;return out;}
  hit(particles,clientX,clientY,camera,rect,world){let best=-1,distance=Infinity;const projected={};for(let i=0;i<particles.count;i++){const p=particles.pool[i];if(p.progress>=.95||p.reveal<=.2)continue;this.project(p,camera,rect,projected);if(projected.z< -1||projected.z>1)continue;const d=Math.hypot(clientX-projected.x,clientY-projected.y);if(d<Math.max(24,(particles.def.hitRadius??40)*this.pixelsPerUnit(camera,rect))&&d<distance){distance=d;best=i;}}
    if(best<0)return -1;
    this.worldPosition(particles.pool[best],this.point);if(this.occluded(this.point,camera,world))return -1;
    return best;
  }
  occluded(point,camera,world){
    if(!world?.objects||!world?.terrainMeshes)return false;
    this.hitPoint.copy(point).sub(camera.position);const length=this.hitPoint.length();this.raycaster.ray.set(camera.position,this.hitPoint.normalize());this.raycaster.near=.01;this.raycaster.far=Math.max(.01,length-.08);this.hits.length=0;
    this.raycaster.intersectObjects([...world.terrainMeshes,...world.objects.values()].filter(o=>o.visible),true,this.hits);this.raycaster.far=Infinity;return this.hits.length>0;
  }
  angle(x,y,camera){this.point.copy(this.u).multiplyScalar(x).addScaledVector(this.v,y).transformDirection(camera.matrixWorldInverse);return Math.atan2(this.point.y,this.point.x)-Math.PI/2;}
  pixelsPerUnit(camera,rect){this.origin(this.point).applyMatrix4(camera.matrixWorldInverse);return rect.height*.5*camera.projectionMatrix.elements[5]/Math.max(.1,-this.point.z)*this.unit;}
}

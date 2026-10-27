import {Box3,Vector3} from 'three';
import {wallCollisionBounds} from '../world/wall-collision-frame.js';

// One set of terrain tiles/solids for the shared articulated world. Refresh on
// admission/removal, not every frame; overlapping actors never duplicate ground.
export class BeastPhysicsEnvironment {
 constructor(world,solver){this.world=world;this.solver=solver;this.colliders=new Map();}
 sync(animals){
  const wanted=new Set(),w=this.world,s=this.solver;
  const keep=(key,create)=>{wanted.add(key);if(!this.colliders.has(key))this.colliders.set(key,create());};
  for(const animal of animals){
   for(let tz=Math.floor((animal.z-8)/8);tz<=Math.floor((animal.z+8)/8);tz++)for(let tx=Math.floor((animal.x-8)/8);tx<=Math.floor((animal.x+8)/8);tx++){
    keep(`ground:${tx}:${tz}`,()=>{const vertices=[],indices=[];
     for(let z=0;z<=8;z++)for(let x=0;x<=8;x++){const px=tx*8+x,pz=tz*8+z;vertices.push(px,w.nav.field.surface(px,pz),pz);}
     for(let z=0;z<8;z++)for(let x=0;x<8;x++){const i=z*9+x;indices.push(i,i+9,i+1,i+1,i+9,i+10);}
     return s.terrain(new Float32Array(vertices),new Uint32Array(indices));
    });
   }
   for(const structure of w.state.structures){
    if(structure.status!=='intact'||Math.hypot(structure.x-animal.x,structure.z-animal.z)>10)continue;
    if(structure.kind==='wall')keep('structure:'+structure.id,()=>{const b=wallCollisionBounds(structure,0),y=w.nav.field.surface(structure.x,structure.z);return s.box({x:(b[0]+b[2])/2,y:y+1.25,z:(b[1]+b[3])/2},{x:(b[2]-b[0])/2,y:1.25,z:(b[3]-b[1])/2});});
    else {const object=w.objects.get(structure.id);if(object)keep('structure:'+structure.id,()=>{const box=new Box3().setFromObject(object),center=box.getCenter(new Vector3()),half=box.getSize(new Vector3()).multiplyScalar(.5);return half.x>0&&half.y>0&&half.z>0?s.box(center,half):null;});}
   }
   for(const p of w.nav.propsAt?.(animal.x,animal.z,8)??[])if(p.slot<4||p.slot>=10&&p.slot<=12||p.slot>=18)keep(`prop:${p.slot}:${p.x}:${p.z}`,()=>{const r=p.radius??1,y=w.nav.field.surface(p.x,p.z);return s.box({x:p.x,y:y+1.5,z:p.z},{x:r,y:1.5,z:r});});
  }
  for(const [key,collider] of this.colliders)if(!wanted.has(key)){if(collider){s.world.removeCollider(collider,true);const i=s.obstacles.indexOf(collider);if(i>=0)s.obstacles.splice(i,1);}this.colliders.delete(key);}
 }
}

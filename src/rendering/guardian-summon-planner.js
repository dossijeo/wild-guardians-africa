import {guardianPropVolumes} from './guardian-prop-volumes.js';
import {guardianPlacement} from './guardian-placement.js';
import {CameraBuildingRegistry} from './camera-building-registry.js';
import {wallCollisionBounds} from '../world/wall-collision-frame.js';

// Uses the same world inputs as GuardianSummons. The returned origin also
// affects authoritative attack physics, so callers must supply complete,
// current navigation and visual occlusion data.
export function planGuardianSummon(planner,entityId,point,{bodyScale=1,hoverAbove=false,strictProps=false}={}){
 const w=planner.world,target=w.state.raid?.animals.find(a=>a.id===entityId)??w.state.plants.find(p=>p.id===entityId&&p.alive)??w.state.structures.find(s=>s.id===entityId)??point;if(!target)return null;
 planner.occluders??=new CameraBuildingRegistry({centerMargin:0,villageMargin:0});
 planner.occluders.sync(w.objects,[...w.state.villages,...w.state.structures.filter(s=>s.kind==='center')]);
 const index=planner.occluders.index;
 for(const id of planner.extraOccluders??[])index.delete(id);planner.extraOccluders=[];
 const add=(id,min,max)=>{index.set(id,{min,max});planner.extraOccluders.push(id);};
 for(const wall of w.state.structures)if(wall.kind==='wall'&&wall.status==='intact'&&Math.hypot(wall.x-target.x,wall.z-target.z)<15){const b=wallCollisionBounds(wall,0),y=w.nav.field.surface(wall.x,wall.z);add('wall:'+wall.id,[b[0],y,b[1]],[b[2],y+2.5,b[3]]);}
 for(const volume of guardianPropVolumes(w.nav,w.pack?.assets,target,{strict:strictProps}))add(volume.id,volume.min,volume.max);
 const eye=w.camera.position.toArray();
 return guardianPlacement({target,bodyScale,hoverAbove,screenExclusions:w.guardianScreenExclusions?.()??[],camera:w.camera,nav:w.nav,state:w.state,occluded:(x,y,z)=>!!index.sweep(eye,[x,y,z]),occupied:(x,y,z)=>!!index.sweep([x,y-bodyScale,z],[x,y+1.2*bodyScale,z],1.2*bodyScale),cropHeight:p=>w.cropBatch.sample(p.species,p.growth).height});
}

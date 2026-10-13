import {wallCollisionFrame} from '../wall-collision-frame.js';
import {gateFrameFootprints} from '../gate-passages.js';

// Only rigid wall modules are representable by one oriented rectangle. Native
// gates have separate articulated frame/leaf polygons and need their own
// spatial command before this bridge can be used for complete game state.
export function addSpatialWall(core,wall){
  if(wall?.kind!=='wall'||wall.gate||wall.status==='ruined')
    throw TypeError('Expected an intact, non-gate wall module');
  const frame=wallCollisionFrame(wall);
  const id=core.addOrientedBarrier(frame.x,frame.z,frame.width,frame.depth,frame.yaw,0);
  if(id<=0)throw Error('Could not add the wall to the spatial world');
  return id;
}

export function addSpatialWallsBatch(core,walls){
  if(!Array.isArray(walls)||!walls.length||walls.length>1024)
    throw TypeError('Expected 1–1024 wall modules');
  const barriers=walls.map(wall=>{
    if(wall?.kind!=='wall'||wall.gate||wall.status==='ruined')
      throw TypeError('Expected intact, non-gate wall modules');
    const frame=wallCollisionFrame(wall);
    return {x:frame.x,z:frame.z,halfX:frame.width,halfZ:frame.depth,yaw:frame.yaw};
  });
  return core.addBarriersBatch(barriers);
}

// Gameplay plans worker routes through the fully open gate frame; the moving
// leaf is handled by workerMotionClear while the gate opens. Animals see the
// complete rigid wall envelope. Each native side is enclosed conservatively
// in its wall-local rectangle so this logical graph cannot invent an opening.
export function spatialGateBarriers(gate){
  if(gate?.kind!=='wall'||!gate.gate||gate.status==='ruined')
    throw TypeError('Expected an intact gate module');
  const polygons=gateFrameFootprints(gate,1);
  if(!polygons?.length||polygons.length<2)
    throw TypeError('Gate material has no native frame footprint');
  const frame=wallCollisionFrame(gate),{c,s}=frame;
  const barriers=polygons.slice(0,2).map(polygon=>{
    const points=polygon.map(point=>{
      const dx=point.x-gate.x,dz=point.z-gate.z;
      return {x:dx*c-dz*s,z:dx*s+dz*c};
    });
    const xs=points.map(p=>p.x),zs=points.map(p=>p.z);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    const midX=(minX+maxX)/2,midZ=(minZ+maxZ)/2;
    return {x:gate.x+midX*c+midZ*s,z:gate.z-midX*s+midZ*c,
      halfX:(maxX-minX)/2,halfZ:(maxZ-minZ)/2,yaw:frame.yaw,passMask:0};
  });
  barriers.push({x:frame.x,z:frame.z,halfX:frame.width,halfZ:frame.depth,
    yaw:frame.yaw,passMask:1});
  return barriers;
}

export function addSpatialGate(core,gate){
  return core.addBarriersBatch(spatialGateBarriers(gate));
}

export function spatialStructureBarriers(structure){
  if(structure?.kind!=='wall'||structure.status==='ruined')
    throw TypeError('Expected an intact wall or gate module');
  if(structure.gate)return spatialGateBarriers(structure);
  const frame=wallCollisionFrame(structure);
  return [{x:frame.x,z:frame.z,halfX:frame.width,halfZ:frame.depth,
    yaw:frame.yaw,passMask:0}];
}

export function addSpatialStructuresBatch(core,structures){
  if(!Array.isArray(structures)||!structures.length||structures.length>1024)
    throw TypeError('Expected 1–1024 intact wall or gate modules');
  const barriers=[],counts=[];
  for(const structure of structures){
    const parts=spatialStructureBarriers(structure);
    barriers.push(...parts);counts.push(parts.length);
  }
  if(barriers.length>1024)throw RangeError('Too many spatial pieces in one batch');
  const ids=core.addBarriersBatch(barriers),groups=[];
  let offset=0;
  for(const count of counts){groups.push(ids.slice(offset,offset+count));offset+=count;}
  return groups;
}

export function removeSpatialStructure(core,ids){
  if(!Array.isArray(ids)||!ids.length)throw TypeError('Expected spatial barrier IDs');
  return ids.every(id=>core.removeBarrier(id)===1);
}

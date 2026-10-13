import {wallCollisionFrame} from '../wall-collision-frame.js';

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

import {navigationBounds} from './navigation-bounds.js';
import {wallCollisionBounds} from './wall-collision-frame.js';

const CELL=16,MAX_CELLS_PER_OBSTACLE=256,MAX_CELLS_PER_QUERY=256;
const key=(x,z)=>`${x},${z}`;

// Broad phase only: every returned candidate still uses the native swept
// footprint, gate, terrain and fluid tests in its original order.
export function buildNavigationObstacleIndex(obstacles){
 const cells=new Map(),global=[];
 for(let i=0;i<obstacles.length;i++){
  const obstacle=obstacles[i];
  // Gate leaves move as they open; their complete swept bounds are not fixed.
  const bounds=obstacle.gate?null:obstacle.kind==='wall'?wallCollisionBounds(obstacle,0):navigationBounds(obstacle);
  if(!bounds||!bounds.every(Number.isFinite)){global.push(i);continue;}
  const minX=Math.floor(bounds[0]/CELL),maxX=Math.floor(bounds[2]/CELL);
  const minZ=Math.floor(bounds[1]/CELL),maxZ=Math.floor(bounds[3]/CELL);
  if((maxX-minX+1)*(maxZ-minZ+1)>MAX_CELLS_PER_OBSTACLE){global.push(i);continue;}
  for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
   const id=key(x,z),entries=cells.get(id)??[];entries.push(i);cells.set(id,entries);
  }
 }
 return {obstacles,cells,global,marks:new Uint32Array(obstacles.length),serial:0};
}

export function segmentNavigationObstacles(nav,start,end,radius){
 const index=nav.obstacleIndex,obstacles=nav.obstacles;
 if(!index||index.obstacles!==obstacles||obstacles.length<32)return obstacles;
 // Expanding the rotated wall rectangle by a circular actor can expand its
 // world AABB by up to radius*sqrt(2), not merely radius.
 const pad=radius*Math.SQRT2+1e-8;
 const minX=Math.floor((Math.min(start.x,end.x)-pad)/CELL),maxX=Math.floor((Math.max(start.x,end.x)+pad)/CELL);
 const minZ=Math.floor((Math.min(start.z,end.z)-pad)/CELL),maxZ=Math.floor((Math.max(start.z,end.z)+pad)/CELL);
 if((maxX-minX+1)*(maxZ-minZ+1)>MAX_CELLS_PER_QUERY)return obstacles;
 index.serial++;
 if(index.serial===0xffffffff){index.marks.fill(0);index.serial=1;}
 const ids=[];
 const add=i=>{if(index.marks[i]===index.serial)return;index.marks[i]=index.serial;ids.push(i);};
 for(const i of index.global)add(i);
 for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)for(const i of index.cells.get(key(x,z))??[])add(i);
 ids.sort((a,b)=>a-b);
 return ids.map(i=>obstacles[i]);
}

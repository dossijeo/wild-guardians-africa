import {firstCameraVolumeHit} from './camera-volume-sweep.js';

// World-coordinate broad phase, owned by the eventual camera-volume registry.
// Descriptors are copied; construction/streaming/state changes update them
// explicitly rather than traversing scene geometry during every camera query.
export class CameraVolumeIndex {
 constructor({cellSize=16,maxCells=256}={}){
  if(!(cellSize>0)||!Number.isFinite(cellSize)||!Number.isSafeInteger(maxCells)||maxCells<1)throw Error('Invalid camera volume index');
  this.cellSize=cellSize;this.maxCells=maxCells;this.records=new Map();this.cells=new Map();this.large=new Set();this.lastCandidates=0;
 }
 range(minX,minZ,maxX,maxZ){return [Math.floor(minX/this.cellSize),Math.floor(minZ/this.cellSize),Math.floor(maxX/this.cellSize),Math.floor(maxZ/this.cellSize)];}
 keys(range){
  if(range.some(value=>!Number.isSafeInteger(value)))return null;
  const [x0,z0,x1,z1]=range;if((x1-x0+1)*(z1-z0+1)>this.maxCells)return null;
  const keys=[];for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)keys.push(x+','+z);return keys;
 }
 set(id,volume){
  if(volume.min.length!==3||volume.max.length!==3||volume.min.some((x,i)=>!Number.isFinite(x)||!Number.isFinite(volume.max[i])||x>volume.max[i]))throw Error('Invalid camera exclusion volume');
  const box={id,min:volume.min.slice(),max:volume.max.slice()},keys=this.keys(this.range(box.min[0],box.min[2],box.max[0],box.max[2]));
  this.delete(id);this.records.set(id,box);
  if(keys===null)this.large.add(box);
  else for(const key of keys){let bucket=this.cells.get(key);if(!bucket)this.cells.set(key,bucket=new Set());bucket.add(box);}
  box.keys=keys;
 }
 delete(id){
  const box=this.records.get(id);if(!box)return;
  if(box.keys===null)this.large.delete(box);
  else for(const key of box.keys){const bucket=this.cells.get(key);bucket.delete(box);if(!bucket.size)this.cells.delete(key);}
  this.records.delete(id);
 }
 sweep(start,end,radius=0){
  if(start.length!==3||end.length!==3||!Number.isFinite(radius)||radius<0||start.some((x,i)=>!Number.isFinite(x)||!Number.isFinite(end[i])))throw Error('Invalid camera exclusion query');
  const keys=this.keys(this.range(Math.min(start[0],end[0])-radius,Math.min(start[2],end[2])-radius,Math.max(start[0],end[0])+radius,Math.max(start[2],end[2])+radius));
  const candidates=keys===null?this.records.values():new Set(this.large);
  if(keys!==null)for(const key of keys)for(const box of this.cells.get(key)??[])candidates.add(box);
  this.lastCandidates=keys===null?this.records.size:candidates.size;
  return firstCameraVolumeHit(start,end,candidates,radius);
 }
 clear(){this.records.clear();this.cells.clear();this.large.clear();this.lastCandidates=0;}
}

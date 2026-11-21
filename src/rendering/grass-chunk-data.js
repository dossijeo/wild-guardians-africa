import {generateGrassTile} from './grass-tile-generation.js';
import {nearGrassWater} from './grass-water.js';

// Runs on immutable, structured-cloned confirmed inputs. The owner retains the
// versions and decides whether the result may still be published.
export function generateGrassChunkData({key,chunks,blockers,spacing,seed,river,mangrove,fern,edgePadding}) {
 if(!(chunks instanceof Map) || !(blockers instanceof Map) || !Number.isFinite(spacing) || spacing<=0) throw new TypeError('Invalid grass generation request');
 const chunk=chunks.get(key);
 if(!chunk) throw new TypeError('Missing grass chunk');
 const stats={candidates:0,masked:0},items=[];
 for(let tx=chunk.cx*6-3;tx<chunk.cx*6+3;tx++) for(let tz=chunk.cz*6-3;tz<chunk.cz*6+3;tz++) {
  items.push(...generateGrassTile(chunk,tx,tz,{spacing,seed,varied:false,river,mangrove,fern,edgePadding,blockers,nearWater:(c,x,z)=>nearGrassWater(chunks,c,x,z,edgePadding),stats}).items);
 }
 const anchors=new Float32Array(items.length*4),values=new Float32Array(items.length*4),slopes=new Float32Array(items.length*2);
 items.forEach((p,i)=>{anchors.set(p.slice(0,4),i*4);values.set(p.slice(4,8),i*4);slopes.set(p.slice(8,10),i*2);});
 return {anchors,values,slopes,count:items.length,stats};
}

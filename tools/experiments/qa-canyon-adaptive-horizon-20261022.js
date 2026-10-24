import {Geometry} from '/src/rendering/terrain-source.js';
export function buildAdaptiveHorizon(core,region,waterColor,river){
 const started=performance.now(),base=core.horizon(region,waterColor,river);
 const ox=region.cx*48,oz=region.cz*48,near=region.bounds,cells=[],horizontal=new Map(),vertical=new Map();
 const add=(map,k,v)=>{if(!map.has(k))map.set(k,new Set());map.get(k).add(v);};
 const corner=(x,z)=>{add(horizontal,z,x);add(vertical,x,z);};
 let fineCells=0;
 for(let z=oz-384;z<oz+384;z+=8){
  const left=core.riverEdge(z+4,-1)-80,right=core.riverEdge(z+4,1)+80;
  for(let x=ox-384;x<ox+384;x+=4){
   if(x>=near[0]&&z>=near[1]&&x+4<=near[2]&&z+8<=near[3])continue;
   const fine=x+4>=left&&x<=right,dx=fine?2:4,dz=fine?2:8;
   for(let zz=z;zz<z+8;zz+=dz)for(let xx=x;xx<x+4;xx+=dx){
    cells.push([xx,zz,dx,dz]);if(fine)fineCells++;
    corner(xx,zz);corner(xx+dx,zz);corner(xx,zz+dz);corner(xx+dx,zz+dz);
   }
  }
 }
 for(let x=near[0];x<=near[2];x++){corner(x,near[1]);corner(x,near[3]);}
 for(let z=near[1];z<=near[3];z++){corner(near[0],z);corner(near[2],z);}
 for(const map of [horizontal,vertical])for(const [k,v]of map)map.set(k,[...v].sort((a,b)=>a-b));
 const tris=[],points=new Map(),coords=[];
 const id=(x,z)=>{const key=x+','+z;if(!points.has(key)){points.set(key,coords.length/2);coords.push(x,z);}return points.get(key);};
 const tri=(a,b,c)=>tris.push([id(...a),id(...b),id(...c)]);
 const segment=(map,k,a,b)=>map.get(k).filter(v=>v>=a&&v<=b);
 for(const [x,z,dx,dz]of cells){
  const ring=[...segment(vertical,x,z,z+dz).map(v=>[x,v]),...segment(horizontal,z+dz,x,x+dx).slice(1).map(v=>[v,z+dz]),...segment(vertical,x+dx,z,z+dz).slice(0,-1).reverse().map(v=>[x+dx,v]),...segment(horizontal,z,x,x+dx).slice(1,-1).reverse().map(v=>[v,z])];
  if(ring.length===4){tri(ring[0],ring[1],ring[3]);tri(ring[3],ring[1],ring[2]);}
  else {const center=[x+dx/2,z+dz/2];for(let i=0;i<ring.length;i++)tri(center,ring[i],ring[(i+1)%ring.length]);}
 }
 const heights=new Float32Array(coords.length/2),colors=new Float32Array(coords.length/2*3);
 for(let i=0;i<heights.length;i++)heights[i]=core.surfaceAnywhere(coords[i*2],coords[i*2+1]);
 for(let i=0;i<coords.length;i+=100000)colors.set(core.groundColorsAnywhere(Float32Array.from(coords.slice(i,i+100000))),i/2*3);
 const p=i=>[coords[i*2]-ox,heights[i],coords[i*2+1]-oz],c=i=>Array.from(colors.subarray(i*3,i*3+3));
 const g=new Geometry();for(const [a,b,d]of tris)g.tri(p(a),p(b),p(d),c(a),[c(a),c(b),c(d)]);
 base.terrain=new Float32Array(g.v);base.adaptiveBuild={ms:performance.now()-started,cells:cells.length,fineCells,vertices:base.terrain.length/9,unique:heights.length};return base;
}

import {hashCell} from '../../src/world/terrain.js';
// Experimental only: mirrors candidate acceptance in mudPatchGeometry.
// A production design should share the selector rather than duplicate it.
export function captureSelectedMudInputs(field,cx,cz,positions,scale=.115){
 if(!Number.isFinite(scale)||positions.length!==49*49*3)throw Error('Invalid mud input');
 const originX=cx*48,originZ=cz*48,random=(i,salt)=>hashCell(field.seed,cx*13+i,cz*17-i,salt)/4294967296,inside=[],slopes=[],centers=[];
 for(let i=0;i<10;i++){
  const x=originX-19+random(i,84311)*38,z=originZ-19+random(i,84317)*38,rx=1.4+random(i,84319)*2.3,rz=rx*(.65+random(i,84323)*.6),phase=random(i,84329)*Math.PI*2,radius=Math.max(rx,rz);
  if(centers.some(p=>Math.hypot(x-p.x,z-p.z)<radius+p.radius+.2))continue;
  const site=field.c.settlementSite;if(site&&Math.hypot(x-site.x,z-site.z)<site.clearRadius+radius+2)continue;
  const slope=field.slope(x,z);slopes.push([x,z,slope]);if(slope>.23)continue;
  const wet=field.fluidInside(x,z);inside.push([x,z,wet]);if(wet)continue;
  const contour=Array.from({length:12},(_,j)=>{const a=j*Math.PI/6,r=1+.13*Math.sin(a*3+phase)+.08*Math.cos(a*5-phase);return [x+Math.cos(a)*rx*r,z+Math.sin(a)*rz*r];});
  let invalid=false;for(const [px,pz] of contour){if(Math.abs(px-originX)>=24||Math.abs(pz-originZ)>=24){invalid=true;break;}const wet=field.fluidInside(px,pz);inside.push([px,pz,wet]);if(wet){invalid=true;break;}}
  if(!invalid)centers.push({x,z,radius:radius*1.21});
 }
 const heights=new Float32Array(49*49);for(let i=0;i<heights.length;i++)heights[i]=positions[i*3+1];
 return {cx,cz,scale,seed:field.seed,site:field.c.settlementSite??null,heights,inside,slopes};
}

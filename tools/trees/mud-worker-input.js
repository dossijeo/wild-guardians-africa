import {hashCell} from '../../src/world/terrain.js';

// Prototype only: immutable render payload and sampled selection inputs, never
// a second simulation world. Preserve the exact query coordinates used by mud.
export function captureMudInputs(field,cx,cz,positions){
 if(positions.length!==49*49*3)throw Error('Expected a native 49x49 terrain payload');
 const random=(i,salt)=>hashCell(field.seed,cx*13+i,cz*17-i,salt)/4294967296;
 const inside=[],slopes=[];
 for(let i=0;i<10;i++){
  const x=cx*48-19+random(i,84311)*38,z=cz*48-19+random(i,84317)*38;
  const rx=1.4+random(i,84319)*2.3,rz=rx*(.65+random(i,84323)*.6),phase=random(i,84329)*Math.PI*2;
  slopes.push([x,z,field.slope(x,z)]);inside.push([x,z,field.fluidInside(x,z)]);
  for(let j=0;j<12;j++){const a=j*Math.PI/6,r=1+.13*Math.sin(a*3+phase)+.08*Math.cos(a*5-phase),px=x+Math.cos(a)*rx*r,pz=z+Math.sin(a)*rz*r;inside.push([px,pz,field.fluidInside(px,pz)]);}
 }
 const heights=new Float32Array(49*49);for(let i=0;i<heights.length;i++)heights[i]=positions[i*3+1];
 return {cx,cz,seed:field.seed,site:field.c.settlementSite??null,heights,inside,slopes};
}
export function mudSnapshotField(input){
 const inside=new Map(input.inside.map(([x,z,v])=>[x+','+z,v])),slopes=new Map(input.slopes.map(([x,z,v])=>[x+','+z,v]));
 const lookup=(map,x,z)=>{const key=x+','+z;if(!map.has(key))throw Error('Missing immutable sample '+key);return map.get(key);};
 return {seed:input.seed,c:{biome:'mangrove',settlementSite:input.site},fluidInside:(x,z)=>lookup(inside,x,z),slope:(x,z)=>lookup(slopes,x,z),surface:(x,z)=>{const ix=x-input.cx*48+24,iz=z-input.cz*48+24;if(!Number.isInteger(ix)||!Number.isInteger(iz)||ix<0||iz<0||ix>48||iz>48)throw Error('Missing terrain lattice sample');return input.heights[iz*49+ix];}};
}

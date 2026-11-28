import {hashCell,noise} from '../world/terrain.js';
import {footprintDistance} from '../world/footprints.js';
import {sampleGrassTerrain} from './grass-terrain-sampling.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Identical candidate selection for both renderer owners; water and blocker
// queries are injected because their residency belongs to the caller.
export function generateGrassTile(c,tx,tz,{spacing,seed,varied,river,mangrove,fern,edgePadding,blockers,nearWater,stats}){
 const items=[],step=spacing; for(let ix=Math.ceil(tx*8/step);ix<(tx+1)*8/step-1e-6;ix++)for(let iz=Math.ceil(tz*8/step);iz<(tz+1)*8/step-1e-6;iz++){
 const bits=hashCell(seed,ix,iz,8371),x=(ix+.5)*step+((bits&255)/255-.5)*step*(varied?.65:.25),z=(iz+.5)*step+(((bits>>>8)&255)/255-.5)*step*(varied?.65:.25);
 if(x<c.cx*48-24||x>=c.cx*48+24||z<c.cz*48-24||z>=c.cz*48+24)continue;
 const s=sampleGrassTerrain(c,x,z),[cover,meso,moisture,wear]=s.ctx;stats.candidates++;
 if(cover<(river?.20:.10)||(river&&moisture<.20)||wear>.25||Math.hypot(s.sx,s.sz)>.42||nearWater(c,x,z)||(blockers.get(Math.floor(x/8)+','+Math.floor(z/8))??[]).some(o=>o.polygon?footprintDistance(o.polygon,x,z)<edgePadding:Math.hypot(x-o.x,z-o.z)<o.r+edgePadding)){stats.masked++;continue;}
 // Check the footprint against the resident wear mask, keeping leaf reach off paths.
 let edgeWear=wear,fernEdgeCover=cover;for(const [dx,dz] of [[.6,0],[-.6,0],[0,.6],[0,-.6],[.42,.42],[-.42,.42],[.42,-.42],[-.42,-.42]]){const probe=sampleGrassTerrain(c,x+dx*(edgePadding/.6),z+dz*(edgePadding/.6)).ctx;edgeWear=Math.max(edgeWear,probe[3]);if(fern)fernEdgeCover=Math.min(fernEdgeCover,probe[0]);if(edgeWear>.27)break;}if(edgeWear>.27){stats.masked++;continue;}
 if(fern){const edge=Math.max(clamp((.42-fernEdgeCover)/.32,0,1),clamp((edgeWear-.06)/.21,0,1));if(hashCell(seed,ix,iz,21931)/4294967296<.30*edge)continue;}
 items.push([x,s.y+.006,z,(river?clamp((.27-edgeWear)/.17,0,1)*(.65+.25*((bits>>>16)&255)/255)*clamp((cover-.20)/.12,0,1)*clamp((moisture-.20)/.12,0,1):(.80+.32*((bits>>>16)&255)/255)*clamp((cover-.08)/.18,.7,1)),bits/4294967296*Math.PI*2,(varied?noise(x*.19,z*.19,seed^9581)*.65+noise(x*.71,z*.71,seed^9517)*.35:meso*.65+moisture*.35),cover,mangrove?wear:moisture,s.sx,s.sz]);}
 return {chunk:c.cx+','+c.cz,tx,tz,items};
}

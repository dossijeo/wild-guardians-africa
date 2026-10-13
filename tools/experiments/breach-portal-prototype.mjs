// QA-only topology-versioned breach portal table. A module count provides a
// cheap width class; native collision confirms usable crossings once per
// species radius. Ambiguous geometry remains "unknown", never unreachable.
import {wallCollisionFrame} from '../../src/world/wall-collision-frame.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

const speciesRadii=Object.fromEntries(Object.entries(ANIMAL_ACTIONS.animals).map(([id,data])=>[id,data.presentation.footprint.radius]));
const endpoint=(wall,sign)=>{const f=wallCollisionFrame(wall);return {x:wall.x+sign*f.width*f.c,z:wall.z-sign*f.width*f.s};};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const nearEndpoints=(a,b)=>Math.min(...[-1,1].flatMap(i=>[-1,1].map(j=>distance(endpoint(a,i),endpoint(b,j)))))<=.45;
const parallel=(a,b)=>Math.abs(Math.cos((a.yaw??0)-(b.yaw??0)))>.96;

export function breachPortalTable(nav){
  if(nav.__breachPortalPrototype?.version===nav.version)return nav.__breachPortalPrototype;
  const began=performance.now(),broken=nav.state?.structures.filter(s=>s.kind==='wall'&&s.status==='ruined')??[];
  const used=new Set(),portals=[];
  for(const wall of broken){
    if(used.has(wall.id))continue;
    const group=[wall];used.add(wall.id);
    for(let i=0;i<group.length;i++)for(const other of broken){
      if(used.has(other.id)||!nearEndpoints(group[i],other))continue;
      used.add(other.id);group.push(other);
    }
    const straight=group.every(w=>parallel(wall,w));
    const c=Math.cos(wall.yaw??0),s=Math.sin(wall.yaw??0),axis=p=>(p.x-wall.x)*c-(p.z-wall.z)*s;
    const projected=group.flatMap(w=>[endpoint(w,-1),endpoint(w,1)].map(axis));
    const min=Math.min(...projected),max=Math.max(...projected),width=max-min;
    const bySpecies={};
    for(const [species,radius] of Object.entries(speciesRadii)){
      const widthClass=width<radius*2?'too-narrow':width<radius*4?'narrow':'wide';
      if(!straight){bySpecies[species]={radius,widthClass,status:'unknown',reason:'corner',crossings:[]};continue;}
      const crossings=[];
      // Probe multiple lateral offsets so a nearby rock or angled wall cannot
      // make a wide breach look closed merely because its centre is blocked.
      const count=Math.max(1,Math.ceil(width/.5));
      for(let i=0;i<=count;i++){
        const offset=min+(max-min)*i/count;
        const mid={x:wall.x+c*offset,z:wall.z-s*offset};
        const sideDistance=Math.max(.8,radius+.4);
        const from={x:mid.x-s*sideDistance,z:mid.z-c*sideDistance};
        const to={x:mid.x+s*sideDistance,z:mid.z+c*sideDistance};
        if(!nav.walkable(mid.x,mid.z,radius,null,false)||!nav.walkable(from.x,from.z,radius,null,false)||!nav.walkable(to.x,to.z,radius,null,false)||!nav.segmentClear(from,to,radius,null,false))continue;
        crossings.push({from,to});
      }
      bySpecies[species]={radius,widthClass,status:crossings.length?'passable':'unknown',reason:crossings.length?'native-verified':'no-crossing-found',crossings};
    }
    portals.push({id:group.map(w=>w.id).sort().join('+'),moduleIds:group.map(w=>w.id),moduleCount:group.length,width,straight,bySpecies});
  }
  const table={version:nav.version,buildMilliseconds:performance.now()-began,portals};
  nav.__breachPortalPrototype=table;
  return table;
}

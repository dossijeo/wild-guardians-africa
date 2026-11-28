import fs from 'node:fs';

const input=process.env.ROUTE_PROBE_INPUT;if(!input)throw Error('Set ROUTE_PROBE_INPUT');
const data=JSON.parse(fs.readFileSync(input,'utf8')),sectorSize=12;
// Interior intersections only. The result describes geometric sectors
// traversed by the output polyline, not the search graph's visited nodes.
function sectors(route){const result=new Set(),points=[route.from,...route.points];for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k],dx=b.x-a.x,dz=b.z-a.z,times=[0,1];for(const [start,delta] of [[a.x,dx],[a.z,dz]])if(delta){const lo=Math.min(start,start+delta),hi=Math.max(start,start+delta);for(let n=Math.floor(lo/sectorSize)+1;n*sectorSize<hi;n++)times.push((n*sectorSize-start)/delta);}times.sort((x,y)=>x-y);for(let i=1;i<times.length;i++){const t=(times[i-1]+times[i])/2;result.add(`${Math.floor((a.x+dx*t)/sectorSize)},${Math.floor((a.z+dz*t)/sectorSize)}`);}}return [...result].sort();}
const groups=data.rows.map(row=>{const paths=(row.routes??[]).filter(r=>r.status==='found'&&r.from).map(route=>({id:route.id,species:route.species,sectors:sectors(route)})),pairs=[];for(let i=0;i<paths.length;i++)for(let j=i+1;j<paths.length;j++){const other=new Set(paths[j].sectors);pairs.push({first:paths[i].id,second:paths[j].id,sameSpecies:paths[i].species===paths[j].species,shared:paths[i].sectors.filter(s=>other.has(s))});}return {group:row.group,paths,pairs};});
const result={scope:'Geometric overlap of output polylines in 12-unit sectors; one synthetic savanna fixture. Does not expose search graph expansions, component identity, obstacle dependencies or runtime cost.',sectorSize,groups};if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

// Read-only diagnosis of real placement failures on a copied native snapshot.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
import {closedDefenseContours} from './native-closed-defense-policy.mjs';
import {wallStroke} from '../src/world/wall-layout.js';
const [input,output]=process.argv.slice(2);
if(!input||!output||existsSync(output))throw Error('Requires immutable snapshot and fresh output');
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString()),{nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion});nav.setState(s);
const rows=closedDefenseContours(s).map(candidate=>{
 const rejected=[];let accepted=0;
 for(const slot of wallStroke(candidate.points,[],{smooth:false,snap:false})){
  const piece={kind:'wall',material:'zarzas',gate:false,baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle,status:'intact',hp:100};
  const check=nav.wallPlacement(piece);
  if(!check.valid)rejected.push({x:piece.x,z:piece.z,reason:check.reason,fluid:!!check.fluid});
  else if(s.plants.some(p=>{const c=Math.cos(piece.yaw),sn=Math.sin(piece.yaw);return p.alive&&Math.abs((p.x-piece.x)*c-(p.z-piece.z)*sn)<1.09*piece.baseScaleX+.4&&Math.abs((p.x-piece.x)*sn+(p.z-piece.z)*c)<.62;}))rejected.push({x:piece.x,z:piece.z,reason:'crop-overlap'});
  else accepted++;
 }
 return {...candidate,accepted,rejected};
});
const result={input,inputSha256:createHash('sha256').update(bytes).digest('hex'),day:s.day,time:s.time,plants:s.plants.filter(p=>p.alive).map(p=>({id:p.id,x:p.x,z:p.z})),centers:s.structures.filter(p=>p.kind==='center').map(p=>({id:p.id,x:p.x,z:p.z})),rows,scope:'Native wallPlacement diagnosis only; no purchases, synthetic barriers or simulation ticks.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({bounds:r.bounds,accepted:r.accepted,reasons:r.rejected.reduce((a,p)=>(a[p.reason]=(a[p.reason]??0)+1,a),{})}))));

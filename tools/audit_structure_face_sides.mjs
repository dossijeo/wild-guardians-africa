// Audit precisely the draw ranges rendered by native villages and wall endpoints.
// Conservative topology eligibility is not visual approval or a performance result.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import sharp from 'sharp';
import {auditSidedness} from './mesh-sidedness.mjs';
const output=process.argv[2];
if(!output||process.argv.length!==3)throw Error('Usage: node tools/audit_structure_face_sides.mjs OUTPUT.json');
const hash=data=>createHash('sha256').update(data).digest('hex');
const sourceHashes={};
async function load(path){const bytes=await readFile(path);sourceHashes[path]=hash(bytes);return bytes;}
const buffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const report={method:'Exact-position welding, opposite edge orientation, no degenerate triangles and positive signed volume for every connected component. Rejection does not prove DoubleSide necessary; eligibility is not visual approval.',scope:'Native village draw ranges and native wall endpoint meshes only. No procedural center interiors/ash, character skinning or wall bridge intermediate topology approval.',villages:[],walls:[],sourceHashes};
const villages=JSON.parse(await load('public/content/villages.json'));
for(const village of villages){
 const bytes=await load('public'+village.binary.url),raw=buffer(bytes),vertices=new Float32Array(raw,0,village.vertexBytes/4),indices=new Uint32Array(raw,village.vertexBytes,village.indexCount);
 const atlas=await load('public'+village.textures.color),opaque=(await sharp(atlas).stats()).isOpaque;
 const units=village.units.map(unit=>{
  // Remap just referenced vertices: unused village positions must not influence this unit.
  const map=new Map(),positions=[],index=[];
  for(const source of indices.subarray(unit.offset,unit.offset+unit.count)){
   let id=map.get(source);if(id===undefined){id=map.size;map.set(source,id);positions.push(vertices[source*8],vertices[source*8+1],vertices[source*8+2]);}index.push(id);
  }
  const topology=auditSidedness(new Float32Array(positions),new Uint32Array(index));
  return {unit:unit.id??unit.name??unit.offset,offset:unit.offset,count:unit.count,topology,colorTopologyEligible:opaque&&topology.closedOutward};
 });
 report.villages.push({culture:village.id,atlasOpaque:opaque,units});
}
const walls=JSON.parse(await load('public/content/walls.json'));
const wallAtlas=await load('public'+walls.texture),wallOpaque=(await sharp(wallAtlas).stats()).isOpaque;
for(const [piece,model] of Object.entries(walls.pieces)){
 const p=await load('public'+model.p.url),i=await load('public'+model.i.url),topology=auditSidedness(new Float32Array(buffer(p)),new Uint16Array(buffer(i)));
 report.walls.push({piece,atlasOpaque:wallOpaque,topology,colorTopologyEligible:wallOpaque&&topology.closedOutward});
}
report.summary={villageUnits:report.villages.reduce((n,v)=>n+v.units.length,0),eligibleVillageUnits:report.villages.reduce((n,v)=>n+v.units.filter(u=>u.colorTopologyEligible).length,0),wallEndpoints:report.walls.length,eligibleWallEndpoints:report.walls.filter(w=>w.colorTopologyEligible).length};
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));

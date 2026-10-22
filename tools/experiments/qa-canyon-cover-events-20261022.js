import {BlenderGroundDetails,markGroundDetailEvent} from '/src/rendering/blender-ground-details.js';
import {observeGameEvents,emit} from '/src/simulation/game.js';
import {auditBankCover} from './qa-canyon-cover-footprint-20261022.js';
export async function verifyCoverEvents(w){
 const s={...w.state,plants:[...w.state.plants],structures:[...w.state.structures],villages:[...w.state.villages],events:[],sequence:0};
 const scene=new w.scene.constructor(),d=new BlenderGroundDetails(w.assets,scene,'canyons');await d.load();
 const previous=new Map(),release=observeGameEvents(s,e=>markGroundDetailEvent(d,s,e,id=>previous.get(id)));
 try{
 for(const key of w.chunks.keys()){const [cx,cz]=key.split(',').map(Number);d.chunk(cx,cz,w.nav.field,s);}
 const snapshot=()=>JSON.stringify([...d.chunks]);const original=snapshot();
 const points=[...d.chunks.values()].flat();const seam=p=>Math.min(Math.abs(Math.abs(p.x-Math.round(p.x/48)*48)-24),Math.abs(Math.abs(p.z-Math.round(p.z/48)*48)-24));
 points.sort((a,b)=>seam(a)-seam(b));const site=points[0];if(!site)throw Error('No event test site');const records=[];
 const probe=(label,event)=>{emit(s,event.type,event);const dirty=[...d.dirtyChunks],ms=d.flush(w.nav.field,s);const footprint=auditBankCover({...w,state:s,groundDetails:d});if(footprint.blockedFootprintInstances||footprint.wetAnchors||footprint.waterOverhangInstances)throw Error(label+' footprint violation');if(d.flush(w.nav.field,s)!==0)throw Error('Idle resampling');records.push({label,dirty,ms,footprint,count:d.count,restored:snapshot()===original});};
 const crop={id:'qa-cover-crop',alive:true,x:site.x,z:site.z};s.plants.push(crop);probe('crop placed',{type:'CropPlaced',targetId:crop.id});crop.alive=false;probe('crop picked',{type:'CropPicked',targetId:crop.id});if(snapshot()!==original)throw Error('Crop restoration failed');
 const wall={id:'qa-cover-wall',kind:'wall',status:'intact',x:site.x,z:site.z};s.structures.push(wall);probe('wall built',{type:'WallChainBuilt',targetId:wall.id,count:1});s.structures=s.structures.filter(p=>p!==wall);previous.set(wall.id,wall);probe('wall removed',{type:'WallRemoved',targetId:wall.id});if(snapshot()!==original)throw Error('Wall restoration failed');
 const center={id:'qa-cover-center',kind:'center',status:'intact',x:site.x,z:site.z};s.structures.push(center);probe('center placed',{type:'PlacementCommitted',targetId:center.id});center.status='ruined';probe('center ruined',{type:'StructureRuined',targetId:center.id});if(snapshot()!==original)throw Error('Center restoration failed');
 return {site,seamDistance:seam(site),records,note:'Isolated copied state and offscreen scene with actual campaign field/assets and event bus; not real gameplay commands.'};
 }finally{release();d.dispose();}
}

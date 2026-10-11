// Opt-in QA experiment only. Actual quotes, purchases and gate selection keep
// their native IDs. Retain the FIRST quote's virtual metadata only while every
// other plan field and the native obstacle epoch remain identical.
const records=new WeakMap();
import {proofGeometrySignature} from './proof-geometry-signature-candidate.mjs';
export function stableProspectiveWallPlan(state,nav,plan,{gateAnimationInvariant=false}={}){
 const reset=()=>{records.delete(nav);return plan;};
 if(!Array.isArray(plan?.pieces)||!Array.isArray(plan.previewPieces)||!Array.isArray(plan.updates)||!plan.pieces.length)return reset();
 const pieces=plan.pieces;
 if(pieces.some(p=>p.kind!=='wall'||typeof p.id!=='string'||!Number.isSafeInteger(p.created)))return reset();
 const indices=new Map(pieces.map((p,i)=>[p.id,i]));
 if(indices.size!==pieces.length)return reset();
 const occupied=new Set([...(state.structures??[]),...(state.villages??[]),...(nav.obstacles??[])].map(p=>p.id));
 if(pieces.some(p=>occupied.has(p.id)))return reset();
 const mapItems=(items,metadata)=>items.map(p=>{
  const index=indices.get(p.id);if(index===undefined)return p;
  const copy={...p,id:metadata[index].id};
  if(Object.hasOwn(p,'created'))copy.created=metadata[index].created;
  return copy;
 });
 const normalized=pieces.map((_p,i)=>({id:['pending',i],created:['pending',i]}));
 const transform=metadata=>({...plan,pieces:mapItems(pieces,metadata),previewPieces:mapItems(plan.previewPieces,metadata),updates:mapItems(plan.updates,metadata)});
 const key=proofGeometrySignature([nav.version,transform(normalized),nav.obstacles,state.structures,state.villages,state.suppressed,state.culture],gateAnimationInvariant);
 let record=records.get(nav);
 if(record?.state!==state||record.key!==key||record.metadata.some(p=>occupied.has(p.id))){
  record={state,key,metadata:pieces.map(p=>({id:p.id,created:p.created}))};records.set(nav,record);
  return plan;
 }
 return transform(record.metadata);
}

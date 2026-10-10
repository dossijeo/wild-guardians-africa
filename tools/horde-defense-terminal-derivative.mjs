import assert from 'node:assert/strict';
// Read-only correction of a report field; operational() is centre-specific.
// Missing/non-wall IDs stay explicit unknowns, never become ruined walls.
export function ownedWallStateCounts(state,built){
 const ids=new Set(built?.ids??[]),byId=new Map(state.structures.map(s=>[s.id,s]));
 const counts={intact:0,ruined:0,collapsing:0,other:0,missing:0,nonWall:0,fullHp:0,gates:0};
 for(const id of ids){const w=byId.get(id);if(!w){counts.missing++;continue;}if(w.kind!=='wall'){counts.nonWall++;continue;}
  if(Object.hasOwn(counts,w.status)&&['intact','ruined','collapsing'].includes(w.status))counts[w.status]++;else counts.other++;
  if(w.hp===w.maxHp)counts.fullHp++;if(w.gate)counts.gates++;
 }
 assert.equal(counts.intact+counts.ruined+counts.collapsing+counts.other+counts.missing+counts.nonWall,ids.size);
 return {ownedIds:ids.size,...counts,scope:'Derived native wall status only; intact/fullHP does not prove a closed perimeter or protected crops'};
}

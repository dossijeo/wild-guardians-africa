// BAST ordinary damage: 480 ms cubic ease; collapse: 1.4 s smoothstep.
// Persist origins in the domain so renderer creation/cadence cannot change them.
const clamp=x=>Math.max(0,Math.min(1,x));
export function wallVisualAt(entity,elapsed){
 const ratio=clamp(entity.hp/entity.maxHp),p=entity.wallPresentation;
 if(entity.status==='ruined')return 0;
 if(entity.status==='collapsing'){
  const t=clamp(1-entity.collapseRemaining/1.4);
  return (p?.collapseFrom??ratio)*(1-t*t*(3-2*t));
 }
 if(!p||p.to!==ratio)return ratio;
 const t=clamp((elapsed-p.at)/.48);
 return p.from+(p.to-p.from)*(1-(1-t)**3);
}
export function recordWallPresentation(entity,from,elapsed){
 entity.wallPresentation={from,to:clamp(entity.hp/entity.maxHp),at:elapsed,...(entity.status==='collapsing'?{collapseFrom:from}:{})};
}

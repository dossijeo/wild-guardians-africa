import {nextRandom,randomInt,cropSpec} from './rules.js';
import {isMature} from './crops.js';
import {emit,notice} from './game.js';
export function selectEvent(s) {
  if(s.eventPlan || nextRandom(s)>=.2)return;
  const eligible=s.plants.filter(p=>p.alive);
  const counts=new Map();for(const p of eligible)counts.set(p.species,(counts.get(p.species)??0)+1);
  const species=[...counts].filter(([,count])=>count>=5).map(([id])=>id);
  const specific=nextRandom(s)<.6;
  if(specific&&!species.length)return;
  const negative=nextRandom(s)<.6,severity=randomInt(s,0,2);
  const types=negative?(specific?['frost','plague']:['frost']):['favorable','fertile','season'];
  const kind=types[randomInt(s,0,types.length-1)],selectedSpecies=specific?species[randomInt(s,0,species.length-1)]:null;
  const interval=[[.05,.1],[.1,.2],[.2,.3]][severity];
  s.eventPlan={id:`agricultural-${s.day}`,kind,species:selectedSpecies,severity,magnitude:[.1,.2,.3][severity],affectedFraction:negative?interval[0]+nextRandom(s)*(interval[1]-interval[0]):1,negative,applied:false};
}
export function applyEvent(s) {
  const event=s.eventPlan;if(!event||event.applied)return;
  const eligible=s.plants.filter(p=>p.alive&&(!event.species||p.species===event.species));
  // Sampling without replacement; the persisted RNG guarantees reload equivalence.
  for(let i=eligible.length-1;i>0;i--){const j=randomInt(s,0,i);[eligible[i],eligible[j]]=[eligible[j],eligible[i]];}
  const selected=eligible.slice(0,event.negative?Math.floor(eligible.length*event.affectedFraction):eligible.length);
  event.targetIds=[];
  for(const p of selected) {
    const spec=cropSpec(p.species);
    if(event.kind==='frost') {if(isMature(p))continue;p.growth=Math.max(0,p.growth-spec.growth_seconds*.1);}
    else if(event.kind==='plague') {
      if(isMature(p))continue;
      const due=p.water.find(w=>w.status==='due');
      if(due) {const tolerance=spec.derived_tolerance_seconds*(1+(p.toleranceBonus??0));due.wait+=Math.max(0,tolerance-due.wait)*.5;}
      else p.nextTolerancePenalty=.5;
    } else if(event.kind==='favorable') {
      if(p.water[0].status==='due'||isMature(p))continue;
      const growth=Math.min(spec.growth_seconds,p.growth+spec.growth_seconds*event.magnitude);
      for(const water of p.water)if(water.status==='future'&&water.at<=growth)water.status='due';
      p.growth=growth>=spec.growth_seconds&&p.water.some(w=>w.status==='due')?spec.growth_seconds-1e-7:growth;
    } else if(event.kind==='fertile')p.harvestBonus=event.magnitude*100;
    else if(event.kind==='season'&&!isMature(p))p.toleranceBonus=event.magnitude;
    event.targetIds.push(p.id);
  }
  event.applied=true;
  if(event.targetIds.length) {
    const names={frost:'Estrés nocturno: retrocede el crecimiento',plague:'Plaga: se reduce el margen de riego',favorable:'Noche favorable: avanza el crecimiento',fertile:'Suelo fértil: mejora la próxima cosecha',season:'Buena temporada: aumenta el margen hasta el próximo riego'};
    notice(s,`${names[event.kind]} de ${event.targetIds.length} plantas${event.species?' de '+cropSpec(event.species).name:''}.`,event.targetIds[0]);
    emit(s,'AgriculturalEventApplied',{kind:event.kind,targets:event.targetIds});
  }
}


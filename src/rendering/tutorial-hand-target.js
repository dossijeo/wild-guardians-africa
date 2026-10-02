import {isMature} from '../simulation/crops.js';
// These IDs describe real game entities or proposed, legal ground positions.
// No demonstration cart or parcel is inserted into the simulation.
export function tutorialHandTarget(state,nav){
  if(state.day!==1||state.result||state.tutorial.step==='done')return null;
  const village=state.villages[0],entry=village.entry??village;
  const center=state.structures.find(s=>s.kind==='center'&&s.status!=='ruined');
  const plant=state.plants.find(p=>p.alive),mature=state.plants.find(p=>p.alive&&isMature(p));
  const position=p=>[p.x,nav.field.surface(p.x,p.z)+.025,p.z];
  const target=(kind,p,id=p.id)=>({kind,target:id,position:position(p)});
  const ground=(anchor,radius)=>{
    for(let ring=1;ring<=8;ring++)for(let i=0;i<16;i++){
      const a=i*Math.PI/8,p={x:anchor.x+Math.sin(a)*(radius+ring),z:anchor.z+Math.cos(a)*(radius+ring)};
      if(nav.placement(p.x,p.z,radius).valid)return p;
    }
    return null;
  };
  switch(state.tutorial.step){
    case 'intro':return target('open',entry,'village-entry');
    case 'center':{
      const site=center??ground(entry,2.6);return site?target('point',site,center?.id??'center-site'):null;
    }
    case 'plant':{
      const site=plant??(center&&ground(center,.5));return site?target('tap',site,plant?.id??'plant-site'):null;
    }
    case 'hire':return center?target('press',center):null;
    case 'observe':{
      const worker=state.workers.find(w=>!['home','waiting'].includes(w.status));
      if(!worker)return plant?target('open',plant):null;
      const path=[worker,...(worker.path??[])];
      if(path.length===1&&center)path.push(center);
      return {...target('drag',worker),route:path.map(position)};
    }
    case 'harvest':{
      if(mature??plant)return target('pinch',mature??plant);
      const crate=state.crates?.find(c=>!c.delivered),carrier=crate&&state.workers.find(w=>w.id===crate.carrierId);
      return crate?target('open',carrier??crate):null;
    }
    default:return null;
  }
}

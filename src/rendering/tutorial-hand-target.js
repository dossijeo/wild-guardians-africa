import {previewCenter} from '../simulation/game.js';
import {centerGeometry,centerServicePoint} from '../world/centers.js';
// World hands appear only after the corresponding placement tool is chosen.
export function tutorialHandTarget(state,nav,toolKind=null){
  const step=state.tutorial.step;
  if(state.day!==1||state.result||state.tutorial.basicSkipped||!['center','plant'].includes(step)||toolKind!==step)return null;
  if(state.tutorial.dismissed?.includes('basic.'+step+':')&&!state.tutorial.guideAfterAuto?.includes('basic.'+step))return null;
  const village=state.villages[0],entry=village.entry??village;
  const center=state.structures.find(s=>s.kind==='center'&&s.status!=='ruined');
  const target=(kind,p,id)=>({kind,target:id,minimumScreenHeight:40,position:[p.x,nav.field.surface(p.x,p.z)+.025,p.z]});
  if(step==='center'){
    if(center)return null;
    if(village.center&&previewCenter(state,village.center,nav).valid)return target('point',village.center,'center-site');
    const radius=centerGeometry({culture:village.culture},state).radius;
    for(let ring=1;ring<=8;ring++)for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,p={x:entry.x+Math.sin(angle)*(radius+ring),z:entry.z+Math.cos(angle)*(radius+ring)};
      if(previewCenter(state,p,nav).valid)return target('point',p,'center-site');
    }
    return null;
  }
  if(!center||state.plants.some(p=>p.alive))return null;
  const departure=centerServicePoint(center,state,.8),seen=new Set();
  for(let ring=1;ring<=8;ring++)for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,p={x:Math.round((center.x+Math.sin(angle)*(ring+.5))/1.5)*1.5,z:Math.round((center.z+Math.cos(angle)*(ring+.5))/1.5)*1.5},key=p.x+','+p.z;
    if(seen.has(key))continue;seen.add(key);
    // Keep the native billboard clear of nearby buildings/props. A legal crop
    // can be closer, but its guide must not be lifted onto a neighbouring roof.
    if(nav.placement(p.x,p.z,3.6).valid&&nav.path(departure,p,.28,null,true))return target('tap',p,'plant-site');
  }
  return null;
}

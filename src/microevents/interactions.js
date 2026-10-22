// Shared continuous interaction policies. Values are presentation units, never economy.
const policies={};
const group=(mode,ids,extra={})=>{for(const id of ids)policies[id]=Object.freeze({mode,...extra});};
group('collect',['seeds','fireflies','butterflies','goldenleaves']);
group('catch',['beetle','feather','spirit','star','rareseed','dew','burrow']);
group('scatter',['birds','locusts','insects','spores']);
group('brush',['termites','ants','pathleaves','debris','thornseeds','hail','gust','branch','fallingdebris']);
group('rub',['fire','storm','fog','web','lightning','heat','smoke']);
group('swirl',['dustdevil','vortex']);
group('gather',['pollen','rainbow'],{targetRadius:38});
group('gather',['grain'],{targetRadius:38,drag:'cluster'});
group('gather',['raincloud'],{targetRadius:55,drag:'cluster'});
group('pull',['weeds']);
group('hold',['flower']);
group('guide',['snake'],{exitRadius:125});
group('brush',['termites'],{clearDistance:65});
export const INTERACTIONS=Object.freeze(policies);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function circulation(pointer){const radius=Math.hypot(pointer?.x??0,pointer?.y??0);return radius>8?((pointer.x*(pointer.vy??0)-pointer.y*(pointer.vx??0))/radius):0;}
export function interactionRate(policy,pointer,p,distance,falloff){
 if(!pointer?.owned||!pointer.present||p.reveal<=.2)return 0;
 const speed=Math.hypot(pointer.vx??0,pointer.vy??0),motion=clamp(speed/140,0,3);
 switch(policy.mode){
  case 'hold':return 0; // Explicit accessible hold path supplies this progress.
  case 'catch':case 'collect':return distance<50?2.4*(1-distance/70):0;
  case 'swirl':return Math.min(3,Math.abs(circulation(pointer))/90)*falloff;
  case 'gather':return Math.hypot(p.x,p.y)<policy.targetRadius?2.5:0;
  case 'pull':return p.claimed&&Math.hypot(pointer.x-p.claimX,pointer.y-p.claimY)>14?Math.max(.8,motion)*falloff:0;
  case 'guide':return 0; // One head and an intact following chain, resolved by distance.
  default:return motion*falloff;
 }
}

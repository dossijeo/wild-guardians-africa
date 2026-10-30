import {guardianImpactTime} from '../simulation/guardian-timing.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const names=['blinkL','blinkR','mouthOpen'];
function seed(id){let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)/4294967296;}
function blink(time,phase,period){const t=((time+phase)%period+period)%period;return smooth(t/.055)*(1-smooth((t-.085)/.105));}
// Simulation time drives all cues. No timers, random calls or frame counters.
export function expressionTargets(entity,kind,elapsed,phase,out){
 const period=3.4+phase*2;out[0]=blink(elapsed,phase*period,period);out[1]=blink(elapsed,phase*period-.012,period);out[2]=0;
 if(kind==='worker'){
  const hurt=entity.fallRemaining>0||entity.recovery?.elapsed<.4;
  if(hurt){out[0]=out[1]=.95;out[2]=.72;}
  else if(entity.status==='fleeing')out[2]=.48+.12*Math.sin(elapsed*6+phase*4);
  return out;
 }
 const contact=guardianImpactTime(entity.magicImpact),age=Number.isFinite(contact)?elapsed-contact:Infinity;
 const hurt=age>=0&&age<.6?(1-smooth((age-.12)/.48)):0;
 if(entity.status==='attacking'&&!entity.magicDown&&!(entity.magicStunUntil>elapsed)){
  const p=entity.attackDuration>0?1-(entity.attackRemaining??0)/entity.attackDuration:0;
  out[2]=.65*smooth(p/.18)*(1-smooth((p-.88)/.12));
 }
 out[2]=Math.max(out[2],hurt*.85);
 const shut=Math.max(hurt,entity.magicDown?.phase==='falling'?.72:0);out[0]=Math.max(out[0],shut);out[1]=Math.max(out[1],shut);
 return out;
}
export class ActorExpression{
 constructor(model,id){
  this.phase=seed(id);this.weights=new Float64Array(3);this.target=new Float64Array(3);this.time=null;this.hits=null;this.hurtUntil=-Infinity;this.bindings=[];
  model.traverse(mesh=>{
   const dictionary=mesh.morphTargetDictionary;if(!dictionary||!mesh.morphTargetInfluences)return;
   for(let channel=0;channel<3;channel++){
    const name=names[channel],index=dictionary[name];if(index===undefined)continue;
    const corrective=channel<2&&[25,50,75].every(percent=>dictionary[name+percent]!==undefined);
    const levels=corrective?[.25,.5,.75,1]:[1];
    for(let i=0;i<levels.length;i++){
     const level=levels[i];this.bindings.push({mesh,index:level===1?index:dictionary[name+level*100],channel,level,previous:i?levels[i-1]:0,next:levels[i+1]??1});
    }
   }
  });
 }
 setValues(left,right,mouth){this.weights[0]=left;this.weights[1]=right;this.weights[2]=mouth;this.applyWeights();}
 applyWeights(){
  for(const b of this.bindings){
   const value=Math.max(0,Math.min(1,this.weights[b.channel]));
   const weight=value<=b.level?(value-b.previous)/(b.level-b.previous):b.level===1?1:(b.next-value)/(b.next-b.level);
   b.mesh.morphTargetInfluences[b.index]=Math.max(0,Math.min(1,weight));
  }
 }

 update(entity,kind,elapsed){
  if(!this.bindings.length)return;
  if(kind==='worker'){
   const hits=entity.hits??0;if(this.time!==null&&elapsed<this.time)this.hurtUntil=-Infinity;
   else if(this.hits!==null&&hits>this.hits)this.hurtUntil=elapsed+.55;
   this.hits=hits;
  }
  expressionTargets(entity,kind,elapsed,this.phase,this.target);
  if(kind==='worker'&&elapsed<this.hurtUntil){const strength=smooth((this.hurtUntil-elapsed)/.25);this.target[0]=Math.max(this.target[0],strength);this.target[1]=Math.max(this.target[1],strength);this.target[2]=Math.max(this.target[2],strength*.8);}
  const dt=this.time===null?Infinity:elapsed-this.time;this.time=elapsed;
  const mix=dt<0?1:1-Math.exp(-Math.min(dt,.5)*24);
  // Blink already has an analytic close/hold/open envelope. Filtering it again
  // prevents full closure and makes eyelids depend on frame rate.
  if(dt!==0){this.weights[0]=this.target[0];this.weights[1]=this.target[1];}
  this.weights[2]+=(this.target[2]-this.weights[2])*mix;
  this.applyWeights();
 }
}
export function applyActorExpression(data,entity,kind,elapsed){
 data.expression??=new ActorExpression(data.model,entity.id);data.expression.update(entity,kind,elapsed);
}

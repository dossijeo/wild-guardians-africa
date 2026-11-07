import {BeastRagdollSolver} from '../../src/simulation/beast-ragdoll.js';
// Explicit QA only. Snapshot allocation makes this unsuitable for benchmarks.
export function installRollCapture(parent){
 const rows=[],pending=new WeakMap(),rollTo=BeastRagdollSolver.prototype.rollTo,step=BeastRagdollSolver.prototype.step;
 const link=document.createElement('a');link.id='rollCapture';link.textContent='Descargar estados de giro (0)';link.download='guardian-roll-capture.json';parent.append(link);
 let url=null;
 const refresh=()=>{if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([JSON.stringify({scope:'QA physics snapshots; capture overhead invalidates performance measurements',rows})],{type:'application/json'}));link.href=url;link.textContent=`Descargar estados de giro (${rows.length})`;};
 BeastRagdollSolver.prototype.rollTo=function(id,target,options){
  const result=rollTo.call(this,id,target,options),actor=this.actors.get(id);
  const row={id,target,stepSize:this.stepSize,world:Array.from(this.world.takeSnapshot()),recoveryColliders:[...this.recoveryColliders],actors:[...this.actors].map(([key,a])=>({id:key,age:a.age,quiet:a.quiet,settled:a.settled,kinematic:!!a.kinematic,roll:a.roll?structuredClone(a.roll):null,parts:a.parts.map(p=>({handle:p.body.handle,radius:p.radius}))})),trace:[]};
  rows.push(row);if(rows.length>8)rows.shift();pending.set(actor,{row,age:0});refresh();return result;
 };
 BeastRagdollSolver.prototype.step=function(){
  const result=step.call(this);
  for(const actor of this.actors.values()){
   const item=pending.get(actor);if(!item)continue;
   item.age++;const roll=actor.roll;
   if(item.age%6===0||!roll||roll.done)item.row.trace.push({step:item.age,roll:roll?{age:roll.age,error:roll.error,speed:roll.speed,timedOut:roll.timedOut,done:roll.done}:null});
   if(!roll||roll.done){item.row.outcome=roll?structuredClone(roll):'interrupted';pending.delete(actor);refresh();}
  }
  return result;
 };
 addEventListener('pagehide',()=>{if(url)URL.revokeObjectURL(url);BeastRagdollSolver.prototype.rollTo=rollTo;BeastRagdollSolver.prototype.step=step;},{once:true});
 refresh();
}

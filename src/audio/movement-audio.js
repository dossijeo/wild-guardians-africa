import {FOOTSTEPS} from '../rendering/footsteps-data.js';
import {movingPose,crossedFootsteps} from '../rendering/locomotion-vfx.js';

// Surfaces without a corresponding traversable runtime surface remain catalog
// variants. Callers can provide an authoritative local surface resolver.
export const MOVEMENT_SOUND_IDS=Object.freeze(['step_dry_soil','step_grass','step_mud','step_sand','step_stone','run_surface_set','beast_step_light','beast_step_heavy']);
const surfaces={soil:'step_dry_soil',grass:'step_grass',mud:'step_mud',sand:'step_sand',stone:'step_stone',wood:'step_wood'};
export function movementSound(actor,pose,biome,surface){
  if(!actor.profile)return ['buffalo','rhino'].includes(actor.species)?'beast_step_heavy':'beast_step_light';
  if(pose.name==='Run')return 'run_surface_set';
  return surfaces[surface]??({desierto:'step_sand','gran-rio':'step_grass',manglares:'step_grass',volcanes:'step_stone','gran-canon':'step_stone'}[biome]??'step_dry_soil');
}

export class MovementAudio {
  constructor(play,stopVoice,clock){this.play=play;this.stopVoice=stopVoice;this.clock=clock;this.observations=new Map();this.stateRef=null;this.elapsed=null;}
  release(entry){entry.current=false;for(const source of entry.voices)this.stopVoice(source);entry.voices.clear();}
  update(state,{listener,surfaceAt}={}){
    if(this.stateRef&&this.stateRef!==state||this.elapsed!==null&&state.elapsed<this.elapsed)this.dispose();
    if(state.pauses?.length||state.result){this.dispose();return;}
    if(this.elapsed===state.elapsed)return;
    const dt=this.elapsed===null?0:state.elapsed-this.elapsed,seen=new Set();
    for(const actor of [...state.workers,...(state.raid?.animals??[])]){
      seen.add(actor.id);const pose=movingPose(actor),previous=this.observations.get(actor.id);
      const moved=previous&&Math.hypot(actor.x-previous.x,actor.z-previous.z)>1e-8;
      const clip=pose&&FOOTSTEPS.sources[actor.profile??actor.species]?.clips[pose.name];
      const continuous=clip&&previous?.pose?.name===pose.name&&moved&&dt>0&&dt<=.25;
      if(previous&&!continuous)this.release(previous);
      const entry=continuous?previous:{voices:new Set(),current:true};entry.current=true;
      if(continuous)for(const step of crossedFootsteps(clip,previous.pose.phase,pose.phase)){
        const u=(step.phase-previous.pose.phase)/(pose.phase-previous.pose.phase),yaw=actor.heading??0,c=Math.cos(yaw),s=Math.sin(yaw),[px,pz]=step.point;
        const x=previous.x+(actor.x-previous.x)*u+c*px+s*pz,z=previous.z+(actor.z-previous.z)*u-s*px+c*pz;
        const surface=actor.profile&&pose.name!=='Run'?surfaceAt?.(x,z):undefined;
        const id=movementSound(actor,pose,state.biome,surface),distance=listener?Math.hypot(x-listener.x,z-listener.z):0,requested=this.clock();
        const isCurrent=()=>entry.current&&this.observations.get(actor.id)===entry&&this.clock()-requested<=.25;
        Promise.resolve(this.play(id,{bus:'world',emitter:actor.id,gain:.25/(1+(distance/24)**2),isCurrent})).then(source=>{
          if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}
          entry.voices.add(source);const ended=source.onended;source.onended=()=>{ended?.();entry.voices.delete(source);};
        }).catch(()=>{});
      }
      Object.assign(entry,{x:actor.x,z:actor.z,pose});this.observations.set(actor.id,entry);
    }
    for(const [id,entry] of this.observations)if(!seen.has(id)){this.release(entry);this.observations.delete(id);}
    this.elapsed=state.elapsed;this.stateRef=state;
  }
  dispose(){for(const entry of this.observations.values())this.release(entry);this.observations.clear();this.elapsed=null;this.stateRef=null;}
}

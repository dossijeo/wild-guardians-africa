import {evaluateRemoteClock} from './remote-presentation-clock.js';

function reject(code,message){const error=new Error(message);error.code=code;throw error;}

// Guard the time actually submitted, not the producer's earlier clock sample.
// Propose before changing a GPU generation; consume only after its submission
// succeeds. This guard never changes a lease or silently clamps time forwards.
export function createRemoteFrameTimeGuard(){
 let revision=0,generation=0,elapsed=null,epoch=null,sequence=null;
 const proposals=new WeakMap();
 const status=()=>({revision,generation,elapsed,epoch,sequence});
 return {
  propose({generation:nextGeneration,lease=null,absoluteNow}={}){
   if(!Number.isSafeInteger(nextGeneration)||nextGeneration<1||!Number.isFinite(absoluteNow))throw TypeError('Invalid remote frame time proposal');
   if(nextGeneration<generation)reject('remote-frame-generation-regression','Remote frame generation precedes the presented generation');
   let nextElapsed=null,nextEpoch=epoch,nextSequence=sequence;
   if(lease===null){
    if(elapsed!==null)reject('remote-clock-lease-missing','A timed presentation cannot be replaced without a clock lease');
   }else{
    nextElapsed=evaluateRemoteClock(lease,absoluteNow);
    nextEpoch=lease.epoch;
    if(epoch!==null&&nextEpoch!==epoch)reject('remote-clock-epoch-mismatch','A new clock epoch requires a new presentation session');
    if(lease.sequence!==undefined){
     if(!Number.isSafeInteger(lease.sequence)||lease.sequence<0)throw TypeError('Invalid remote clock sequence');
     nextSequence=lease.sequence;
     if(sequence!==null&&nextSequence<sequence)reject('remote-clock-sequence-regression','Remote clock sequence precedes the presented sequence');
    }
    if(elapsed!==null&&nextElapsed<elapsed)reject('remote-frame-time-regression',`Remote frame would rewind presented time from ${elapsed} to ${nextElapsed}`);
   }
   const ticket=Object.freeze({generation:nextGeneration,elapsed:nextElapsed,absoluteNow});
   proposals.set(ticket,{revision,generation:nextGeneration,elapsed:nextElapsed,epoch:nextEpoch,sequence:nextSequence});
   return ticket;
  },
  consume(ticket){
   const proposal=proposals.get(ticket);
   if(!proposal||proposal.revision!==revision)reject('remote-frame-time-proposal-stale','Remote frame time proposal is stale or was already consumed');
   proposals.delete(ticket);
   generation=proposal.generation;elapsed=proposal.elapsed;epoch=proposal.epoch;sequence=proposal.sequence;revision++;
   return status();
  },
  status,
 };
}

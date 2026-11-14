import {createNativeIntentControlPublication} from './native-intent-control-publication.js';

// Owns the live and temporary draw connections of one authority. A replacement
// is not evidence that its predecessor stopped submitting to its GPU queue.
export function createNativeIntentControlCohort({observe,onError=()=>{},publicationOptions={}}={}){
  if(typeof observe!=='function'||typeof onError!=='function')throw TypeError('Invalid native control cohort');
  const members=new Set();let current=null,pending=null,closed=false,fault=null,boundary=null,nextHold=0;
  function status(){
    const states=[...members].map(member=>member.status()),base=current?.status()??states[0]??{};
    const coherent=states.length>0&&states.every(s=>!s.closed&&!s.retiring&&s.appliedSequence!==null&&
      s.session===base.session&&s.authorityEpoch===base.authorityEpoch&&s.sentSequence===base.sentSequence&&
      s.sentTime===base.sentTime&&s.clockSequence===base.clockSequence);
    return {...base,closed:closed||fault!==null||states.some(s=>s.closed&&!s.drained),
      fault:fault??base.fault??null,coherent,consumers:members.size,attaching:pending!==null,
      pendingMutationHold:boundary?.kind==='mutation'?boundary.id:null};
  }
  function fail(error){
    if(closed||fault)return;fault=String(error?.message??error);
    // Keep the entries: a lost/silent channel is not a drain certificate.
    for(const member of members)member.dispose('cohort-failed');
    try{onError(error instanceof Error?error:Error(fault));}catch{}
  }
  async function attach(port,session){
    if(status().closed||pending||boundary)throw Error('Native intent control attachment unavailable');
    const candidate=createNativeIntentControlPublication({...publicationOptions,port,session,observe,controlOwner:api,onError:fail});
    members.add(candidate);pending=candidate;
    try{
      const result=await candidate.ready;
      if(closed||fault||pending!==candidate)throw Error('Native intent attachment became obsolete');
      // Both connections remain registered until the old GPU is frozen AND
      // drained. No physical proposal is admitted during this handoff.
      if(current&&!current.status().drained)await current.retireGpu('replaced');
      if(closed||fault||pending!==candidate||candidate.status().closed)throw Error('Native intent handoff failed');
      if(current)members.delete(current);
      current=candidate;pending=null;return result;
    }catch(error){
      // A partially bootstrapped renderer may already have submitted work. Its
      // absence or a new baseline cannot erase that uncertainty.
      fail(error);if(pending===candidate)pending=null;throw error;
    }
  }
  function begin(kind){
    const state=status();
    if(state.closed||!state.coherent||pending||boundary)throw Error('Native GPU cohort boundary is not ready');
    const transaction={kind,members:[...members],state};boundary=transaction;return transaction;
  }
  async function fenceGpu(){
    const transaction=begin('fence');
    try{
      const receipts=await Promise.all(transaction.members.map(member=>member.fenceGpu()));
      if(status().closed||boundary!==transaction)throw Error('Native GPU cohort fence became obsolete');
      return receipts[0];
    }catch(error){fail(error);throw error;}
    finally{if(boundary===transaction)boundary=null;}
  }
  async function quiesceGpuForMutation(){
    const transaction=begin('mutation');transaction.id=++nextHold;
    try{
      transaction.receipts=await Promise.all(transaction.members.map(member=>member.quiesceGpuForMutation()));
      if(status().closed||boundary!==transaction)throw Error('Native GPU cohort hold became obsolete');
      const first=transaction.receipts[0];
      transaction.receipt=Object.freeze({...first,holdId:transaction.id});return transaction.receipt;
    }catch(error){fail(error);if(boundary===transaction)boundary=null;throw error;}
  }
  function releaseGpuAfterMutation(receipt,options){
    const transaction=boundary;
    if(status().closed||transaction?.kind!=='mutation'||!transaction.receipt||receipt!==transaction.receipt)
      throw Error('Native GPU cohort receipt is stale');
    try{
      transaction.members.forEach((member,i)=>member.releaseGpuAfterMutation(transaction.receipts[i],options));
      boundary=null;return true;
    }catch(error){fail(error);throw error;}
  }
  const api={attach,status,fenceGpu,quiesceGpuForMutation,releaseGpuAfterMutation,ownsGpuConsumer:consumer=>members.has(consumer),
    connections:()=>({current:current?.status()??null,pending:pending?.status()??null,cohort:status()}),
    dispose(reason='disposed'){if(closed)return;closed=true;for(const member of members)member.dispose(reason);}};
  return api;
}

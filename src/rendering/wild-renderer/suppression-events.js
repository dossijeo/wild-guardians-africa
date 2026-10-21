import {observeGameEvents} from '../../simulation/game.js';

// Confirmed Engine sessions only append suppressed prop identities. Subscribe
// to the existing event boundary; never discover changes by scanning the scene.
export function observeSuppressionRecords(state,onChange=()=>{}){
 let cursor=0,buffer=new Int32Array(24),count=0,records=buffer.subarray(0,0);
 const update=()=>{
  const previousCount=count;
  if(state.suppressed.length<cursor)throw Error('Suppression reset requires a new renderer session');
  while(cursor<state.suppressed.length){
   const id=state.suppressed[cursor],match=/^spatial:([0-5]):(-?\d+):(-?\d+)$/.exec(id);
   if(!match)throw Error(`Invalid Engine suppression: ${id}`);
   const values=match.slice(1).map(Number);
   if(values.some(v=>!Number.isSafeInteger(v)||v< -2147483648||v>2147483647))throw RangeError('Suppression ID outside native range');
   if(count+3>buffer.length){const next=new Int32Array(buffer.length*2);next.set(buffer);buffer=next;}
   buffer.set(values,count);count+=3;cursor++;
  }
  if(records.length!==count||records.buffer!==buffer.buffer)records=buffer.subarray(0,count);
  if(count!==previousCount)onChange(records,previousCount/3);
 };
 update();
 const unsubscribe=observeGameEvents(state,update);
 return {get records(){return records;},dispose:unsubscribe};
}

// One timer per roster; failed downloads retain their existing CPU rig. The
// queue never retries a removed/replaced entry or an admission failure.
export function createBakedWalkRetry({delay=5000,retry}={}){
 if(!Number.isFinite(delay)||delay<0||typeof retry!=='function')throw TypeError('Invalid baked walk retry');
 const pending=new Map(),counts=new WeakMap();let closed=false,timer=null,due=Infinity;
 function schedule(){
  if(closed||!pending.size)return;
  let next=Infinity;for(const value of pending.values())next=Math.min(next,value.at);
  if(timer!==null){if(next>=due)return;clearTimeout(timer);}
  due=next;timer=setTimeout(()=>{timer=null;due=Infinity;if(closed)return;const now=performance.now();for(const [id,value] of pending){if(value.at>now)continue;pending.delete(id);retry(id,value.entry);}schedule();},Math.max(0,next-performance.now()));timer?.unref?.();
 }
 return {
  enqueue(id,entry){if(closed)return;const count=(counts.get(entry)??0)+1;counts.set(entry,count);if(count>3)return;pending.set(id,{entry,at:performance.now()+delay*2**(count-1)});schedule();},
  cancel(id){pending.delete(id);},
  reset(id,entry){pending.delete(id);counts.delete(entry);},
  dispose(){if(closed)return;closed=true;if(timer!==null)clearTimeout(timer);timer=null;pending.clear();}
 };
}

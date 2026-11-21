// Send policy changes only; neither render frames nor unchanged settings
// should enqueue repeated Worker messages.
export function createWorkerNightSpeedBridge(){
 const applied=new WeakMap();
 return function sync(runtime,holdsNightSpeed){
  if(!runtime)return;
  const fast=!holdsNightSpeed;
  if(applied.get(runtime)===fast)return;
  // The presentation recovery fence is temporary. Keep the policy unapplied
  // so the first frame after the replacement is published retries it.
  if(runtime.status?.().visualDispatchBlocked===true)return;
  runtime.setNightFastForward(fast);
  applied.set(runtime,fast);
 };
}

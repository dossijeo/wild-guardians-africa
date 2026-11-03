// Send policy changes only; neither render frames nor unchanged settings
// should enqueue repeated Worker messages.
export function createWorkerNightSpeedBridge(){
 const applied=new WeakMap();
 return function sync(runtime,holdsNightSpeed){
  if(!runtime)return;
  const fast=!holdsNightSpeed;
  if(applied.get(runtime)===fast)return;
  runtime.setNightFastForward(fast);
  applied.set(runtime,fast);
 };
}

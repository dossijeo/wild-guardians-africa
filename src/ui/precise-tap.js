// A complete, single-pointer gesture is one selection. Returning a drag to its
// starting pixel does not turn it into a tap; pinch gestures never cast powers.
export class PreciseTap {
 constructor(distance=5){this.distance=distance;this.pointers=new Set();this.candidate=null;}
 down(e){
  this.pointers.add(e.pointerId);
  if(this.pointers.size!==1||e.button!==0||e.shiftKey){this.candidate=null;return;}
  this.candidate={id:e.pointerId,x:e.clientX,y:e.clientY,started:e.timeStamp};
 }
 move(e){
  const c=this.candidate;
  if(c&&c.id===e.pointerId&&Math.hypot(e.clientX-c.x,e.clientY-c.y)>=this.distance)this.candidate=null;
 }
 up(e,cancelled=false){
  const c=this.candidate;this.pointers.delete(e.pointerId);this.candidate=null;
  if(cancelled||this.pointers.size||!c||c.id!==e.pointerId||Math.hypot(e.clientX-c.x,e.clientY-c.y)>=this.distance)return null;
  return {gestureSeconds:Math.max(0,(e.timeStamp-c.started)/1000)};
 }
}

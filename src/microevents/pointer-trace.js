// Bounded, pooled screen-space history, independent of sprite/world-anchor motion.
export class PointerTrace {
  constructor(capacity=16){this.capacity=Math.max(2,Math.floor(capacity));this.samples=Array.from({length:this.capacity},()=>({x:0,y:0,time:0}));this.next=0;this.length=0;this.vx=0;this.vy=0;}
  reset(x,y,time){this.next=0;this.length=0;this.vx=0;this.vy=0;this.add(x,y,time);}
  add(x,y,time){
    if(this.length){const previous=this.samples[(this.next+this.capacity-1)%this.capacity],dt=Math.max(.008,(time-previous.time)/1000);this.vx=Math.max(-1500,Math.min(1500,(x-previous.x)/dt));this.vy=Math.max(-1500,Math.min(1500,(y-previous.y)/dt));}
    Object.assign(this.samples[this.next],{x,y,time});this.next=(this.next+1)%this.capacity;this.length=Math.min(this.capacity,this.length+1);
  }
  latest(){return this.length?this.samples[(this.next+this.capacity-1)%this.capacity]:null;}
  history(){return Array.from({length:this.length},(_,i)=>({...this.samples[(this.next-this.length+i+this.capacity)%this.capacity]}));}
}

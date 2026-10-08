// QA admission only. Never authorizes coverage, cancels an in-flight fence or
// schedules a timer. Pending work is reconsidered by the next scene update.
export class NativePreparationCadence {
 constructor(interval=0){
  if(!Number.isFinite(interval)||interval<0||interval>1000)throw Error('Invalid native preparation interval');
  this.interval=interval;this.last=-Infinity;
 }
 admit(now){
  if(!Number.isFinite(now))throw Error('Invalid native preparation clock');
  if(now<this.last)throw Error('Native preparation clock moved backwards');
  if(now-this.last<this.interval)return false;
  this.last=now;return true;
 }
}

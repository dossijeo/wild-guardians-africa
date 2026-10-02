// Foreground-time phases and durations from Guardian V8's TRANSITION.
export class GuardianLifecycle {
  constructor(reduced=false){
    this.durations={enter:reduced?.22:.82,change:reduced?.12:.16,farewell:reduced?0:.72,exit:reduced?.24:.90};
    this.phase='closed';this.age=0;
  }
  open(){
    this.phase=['closed','farewell','outro'].includes(this.phase)?'intro':this.phase==='intro'?'intro':'changing';
    this.age=0;
  }
  finish(){if(!['closed','farewell','outro'].includes(this.phase)){this.phase='farewell';this.age=0;}}
  close(){this.phase='closed';this.age=0;}
  advance(seconds,readingDuration){
    this.age+=Math.max(0,seconds);
    // Preserve the original controller's one transition per foreground frame.
    const limit={intro:this.durations.enter,changing:this.durations.change,reading:readingDuration,farewell:this.durations.farewell,outro:this.durations.exit}[this.phase];
    if(limit!==undefined&&this.age>=limit){
      this.phase={intro:'reading',changing:'reading',reading:'rest',farewell:'outro',outro:'closed'}[this.phase];this.age=0;
    }
  }
  sample(gesture,readingDuration){
    const state={intro:'enter',farewell:'farewell',outro:'exit',reading:gesture}[this.phase]??'idle';
    const duration={intro:this.durations.enter,farewell:2.4,outro:this.durations.exit}[this.phase]??readingDuration;
    return {state,age:this.age,duration};
  }
}

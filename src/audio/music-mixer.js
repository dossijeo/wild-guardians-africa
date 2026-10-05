import {MUSIC_POLICIES,musicEventLevels} from './music-policy.js';

// Vertical mixing follows the lab's WebAudio clock, grid and progressive layer order.
// Section navigation is independent: changing scene never restarts a source.
export class MusicMixer {
  constructor(pack,bank,voices,start,scene='day',{automatic=false,random=Math.random}={}) {
    this.pack=pack;this.automatic=automatic;this.random=random;this.lastAutoId=null;this.event=null;
    this.policy=MUSIC_POLICIES[pack];this.bank=bank;this.voices=new Map(bank.tracks.map(track=>[track.id,new Set(voices.has(track.id)?[voices.get(track.id)]:[])]));this.start=start;
    this.scale=(bank.safetyGain??.5)*.45;this.scene=scene;this.pending=[];
    this.curves=new Map(bank.tracks.map((track,i)=>{const value=this.policy.levels[scene][i];return [track.id,{from:value,to:value,start:0,end:0}];}));
    this.levels=new Map(bank.tracks.map((track,i)=>[track.id,this.policy.levels[scene][i]]));
    this.nextAuto=start+this.interval();
  }
  interval(){return 240/this.policy.bpm*this.policy.cadence;}
  boundary(now){const origin=this.start+this.policy.gridOffset,step=240/this.policy.bpm*this.policy.quantize;return origin+Math.ceil((now+.2-origin)/step)*step;}
  value(id,time) {
    const curve=this.curves.get(id);
    if(time<=curve.start)return curve.from;if(time>=curve.end)return curve.to;
    return curve.from+(curve.to-curve.from)*(time-curve.start)/(curve.end-curve.start);
  }
  audibleDuring(id,from,to){
    // Pending entrances must be prefetched before their gain begins to rise.
    // Quiet logical tracks still follow the same clock and gain curves.
    return Math.max(this.value(id,from),this.value(id,to))>0||this.pending.some(task=>task.id===id&&task.to>0&&task.when<=to);
  }
  addVoices(voices,when) {
    for(const [id,gain] of voices){
      this.voices.get(id).add(gain);gain.setValueAtTime(this.value(id,when)*this.scale,when);
      const curve=this.curves.get(id);
      if(curve.end>when){if(curve.start>when)gain.setValueAtTime(curve.from*this.scale,curve.start);gain.linearRampToValueAtTime(curve.to*this.scale,curve.end);}
    }
  }
  removeVoices(voices){for(const [id,gain] of voices)this.voices.get(id).delete(gain);}
  transition(target,now,quantized=true){
      this.levels=new Map(target);this.pending=[];
      const diff=this.bank.tracks.map(track=>track.id).filter(id=>Math.abs(this.value(id,now)-target.get(id))>.015);
      diff.sort((a,b)=>{
        const aOn=this.value(a,now)<.12&&target.get(a)>.12,bOn=this.value(b,now)<.12&&target.get(b)>.12;
        if(aOn!==bOn)return aOn?-1:1;
        return Number(this.policy.anchors.includes(a))-Number(this.policy.anchors.includes(b));
      });
      const bar=240/this.policy.bpm;
      let when=quantized?this.boundary(now):now+.04;
      for(const id of diff){this.pending.push({id,to:target.get(id),when});when+=Math.max(bar,this.policy.fade+.15);}
      this.nextAuto=when+this.interval();
  }
  setCurve(id,to,at,fade){
    const from=this.value(id,at),end=at+fade,gains=this.voices.get(id);if(!gains)return;
    for(const gain of gains){gain.cancelScheduledValues(at);gain.setValueAtTime(from*this.scale,at);gain.linearRampToValueAtTime(to*this.scale,end);}
    this.curves.set(id,{from,to,start:at,end});
  }
  triggerEvent(kind,now){
    if(!['success','failure'].includes(kind))return false;
    const snapshot=this.event?.snapshot??new Map(this.levels),scene=this.event?.scene??this.scene;
    const target=musicEventLevels(this.pack,kind);
    this.pending=[];this.levels=new Map(this.bank.tracks.map((t,i)=>[t.id,target[i]]));
    for(const [id,to] of this.levels)this.setCurve(id,to,now+.04,2.4);
    this.event={kind,snapshot,scene,at:now+240/this.policy.bpm*8};return true;
  }
  evolve(now){
    if(this.pending.length||this.event)return false;
    const base=this.policy.levels[this.scene==='full'?'day':this.scene];
    const active=this.bank.tracks.filter(t=>!t.nearSilent&&this.levels.get(t.id)>.13).length;
    const choices=[];
    for(const [i,track] of this.bank.tracks.entries()){
      const id=track.id,normal=base[i],cur=this.levels.get(id);
      if(track.nearSilent||normal<=.14||id===this.lastAutoId)continue;
      if(cur>.13&&active>Math.max(2,this.policy.density-1)&&!this.policy.anchors.includes(id))choices.push({id,to:0});
      if(cur<.13&&active<this.policy.density+1)choices.push({id,to:normal});
      if(cur>.13)choices.push({id,to:Math.abs(cur-normal)<.08?normal*.48:normal});
    }
    this.nextAuto=now+this.interval();if(!choices.length)return false;
    const action=choices[Math.floor(this.random()*choices.length)];this.lastAutoId=action.id;this.levels.set(action.id,action.to);
    this.pending=[{...action,when:this.boundary(now)}];return true;
  }
  update(scene,now,{protectedUntil=0,nearSplice=false}={}) {
    if(scene!==this.scene){this.scene=scene;this.event=null;this.transition(new Map(this.bank.tracks.map((t,i)=>[t.id,this.policy.levels[scene][i]])),now);}
    while(this.pending.length&&this.pending[0].when<=now+.18) {
      const {id,to,when}=this.pending.shift();this.setCurve(id,to,Math.max(now+.01,when),this.policy.fade);
    }
    if(this.event&&now>=this.event.at){const event=this.event;this.event=null;this.scene=event.scene;this.transition(event.snapshot,now,false);}
    if(this.automatic&&!this.pending.length&&!this.event&&!nearSplice&&now>=protectedUntil&&now>=this.nextAuto)this.evolve(now);
  }
}

import {MUSIC_POLICIES} from './music-policy.js';

// Vertical mixing follows the lab's WebAudio clock, grid and progressive layer order.
// Section navigation is independent: changing scene never restarts a source.
export class MusicMixer {
  constructor(pack,bank,voices,start,scene='day') {
    this.policy=MUSIC_POLICIES[pack];this.bank=bank;this.voices=voices;this.start=start;
    this.scale=(bank.safetyGain??.5)*.45;this.scene=scene;this.pending=[];
    this.curves=new Map(bank.tracks.map((track,i)=>{const value=this.policy.levels[scene][i];return [track.id,{from:value,to:value,start:0,end:0}];}));
  }
  value(id,time) {
    const curve=this.curves.get(id);
    if(time<=curve.start)return curve.from;if(time>=curve.end)return curve.to;
    return curve.from+(curve.to-curve.from)*(time-curve.start)/(curve.end-curve.start);
  }
  update(scene,now) {
    if(scene!==this.scene) {
      this.scene=scene;this.pending=[];
      const target=new Map(this.bank.tracks.map((track,i)=>[track.id,this.policy.levels[scene][i]]));
      const diff=this.bank.tracks.map(track=>track.id).filter(id=>Math.abs(this.value(id,now)-target.get(id))>.015);
      diff.sort((a,b)=>{
        const aOn=this.value(a,now)<.12&&target.get(a)>.12,bOn=this.value(b,now)<.12&&target.get(b)>.12;
        if(aOn!==bOn)return aOn?-1:1;
        return Number(this.policy.anchors.includes(a))-Number(this.policy.anchors.includes(b));
      });
      const bar=240/this.policy.bpm,origin=this.start+this.policy.gridOffset,step=bar*this.policy.quantize;
      let when=origin+Math.ceil((now+.2-origin)/step)*step;
      for(const id of diff){this.pending.push({id,to:target.get(id),when});when+=Math.max(bar,this.policy.fade+.15);}
    }
    while(this.pending.length&&this.pending[0].when<=now+.18) {
      const {id,to,when}=this.pending.shift(),at=Math.max(now+.01,when),from=this.value(id,at),end=at+this.policy.fade;
      const gain=this.voices.get(id);if(!gain)continue;
      gain.cancelScheduledValues(at);gain.setValueAtTime(from*this.scale,at);gain.linearRampToValueAtTime(to*this.scale,end);
      this.curves.set(id,{from,to,start:at,end});
    }
  }
}

import {MUSIC_POLICIES} from './music-policy.js';
import {MusicMixer} from './music-mixer.js';

// The supplied lab moves all ten stems together. Only registered edges can branch.
export class MusicTransport {
  constructor(audio,pack,bank,loaded,{offset=0,random=Math.random}={}) {
    this.audio=audio;this.bank=bank;this.loaded=loaded;this.random=random;this.nav=bank.navigation;
    this.decks=[];this.history=[];this.lastJumpAt=-Infinity;this.lastEdge=null;this.jumps=0;this.loops=0;
    this.policy=MUSIC_POLICIES[pack];this.scene=audio.musicScene??'day';
    this.primary=this.createDeck(audio.context.currentTime+.1,offset,.06);
    this.mixer=new MusicMixer(pack,bank,this.primary.voices,this.primary.start-offset,this.scene,{automatic:true});
    audio.mixer=this.mixer;this.section=this.sectionFor(offset);this.visit('start');
  }
  sectionFor(position){return this.nav.sections.find(s=>position>=s.start-.001&&position<s.end-.001)||this.nav.sections.at(-1);}
  visit(kind){this.history.push({section:this.section.id,kind});if(this.history.length>24)this.history.shift();}
  createDeck(when,offset,fade) {
    const audio=this.audio,gain=audio.context.createGain(),deck={start:when,offset,end:when+this.bank.duration-offset,gain,voices:new Map(),sources:[]};
    gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(1,when+fade);gain.connect(audio.musicGain);
    try {
      for(const {track,buffer} of this.loaded){
        const index=this.bank.tracks.indexOf(track),level=this.mixer?this.mixer.value(track.id,when):this.policy.levels[this.scene][index];
        const source=audio.startBuffer(buffer,{music:true,destination:gain,gain:level*(this.bank.safetyGain??.5)*.45,when,offset,stopAt:deck.end+.01});
        if(!source)throw new Error('Music context suspended while creating deck');
        deck.sources.push(source);deck.voices.set(track.id,audio.voices.get(source).volume.gain);
      }
      this.mixer?.addVoices(deck.voices,when);this.decks.push(deck);return deck;
    }catch(error){for(const source of deck.sources)audio.stopVoice(source);gain.disconnect();throw error;}
  }
  disposeDeck(deck){
    this.mixer?.removeVoices(deck.voices);for(const source of deck.sources)this.audio.stopVoice(source);
    deck.gain.disconnect();this.decks=this.decks.filter(d=>d!==deck);
  }
  dispose(){for(const deck of [...this.decks])this.disposeDeck(deck);this.plan=null;this.primary=null;}
  choose(at){
    const sections=this.nav.sections,natural=sections[sections.indexOf(this.section)+1];
    if(!natural)return {target:sections[0],kind:'wrap'};
    const choices=at-this.lastJumpAt<this.nav.minSecondsBetweenJumps?[]:this.nav.edges.filter(e=>e.enabled&&e.source===this.section.id&&e.id!==this.lastEdge&&e.target!==this.section.id).map(edge=>({edge,target:sections.find(s=>s.id===edge.target)})).filter(c=>c.target);
    if(choices.length&&this.random()<this.nav.defaultBranchChance){
      const density={full:.85,day:.75,activity:1,night:.5,danger:.9,attack:1,spirit:.55,minimal:.5}[this.mixer.scene]??.8;
      const weights=choices.map(c=>(this.history.slice(-3).some(h=>h.section===c.target.id)?.5:1)*(.5+Math.max(0,1-Math.abs(c.target.density-density))));
      let r=this.random()*weights.reduce((a,b)=>a+b,0),index=0;for(;index<weights.length-1&&r>weights[index];index++)r-=weights[index];
      return {target:choices[index].target,edge:choices[index].edge.id,kind:'jump'};
    }
    return {target:natural,kind:'natural'};
  }
  update(scene,now){
    const nearSplice=this.plan&&this.plan.kind!=='natural'&&this.plan.at-now<240/this.policy.bpm*2;
    this.mixer.update(scene,now,{nearSplice,protectedUntil:this.busyUntil??0});
    // A scene change can replan an uncommitted edge, matching chooseScene in the lab.
    if(scene!==this.scene){this.scene=scene;if(!this.plan?.deck)this.plan=null;}
    if(!this.plan){const at=this.primary.start+this.section.end-this.primary.offset;this.plan={...this.choose(Math.max(now,at)),from:this.section,at};}
    const plan=this.plan;
    if(plan.kind!=='natural'&&!plan.deck){
      const fade=plan.target.start<.01?Math.min(4,Math.max(.25,plan.from.end-plan.from.start-.2)):Math.min(this.nav.spliceFade,plan.target.start,.45);
      if(now>=plan.at-fade-2.2){
        if(now<plan.at-fade-.02){
          const when=plan.at-fade,offset=plan.target.start<.01?0:plan.target.start-fade;
          plan.deck=this.createDeck(when,offset,fade);
          this.primary.gain.gain.cancelScheduledValues(when);this.primary.gain.gain.setValueAtTime(1,when);this.primary.gain.gain.linearRampToValueAtTime(0,plan.at);
          for(const source of this.primary.sources)source.stop(plan.at+.012);
          this.primary.stopAt=plan.at+.015;
          const bar=240/this.policy.bpm,busyUntil=plan.at+bar*this.nav.protectAfterJumpBars;
          this.busyUntil=busyUntil;
          for(const task of this.mixer.pending)if(task.when>=plan.at-bar*2&&task.when<busyUntil)task.when=busyUntil;
          this.mixer.pending.sort((a,b)=>a.when-b.when);
        }else if(now>=plan.at-.02){
          // Late callbacks preserve the recorded order; never make a late arbitrary cut.
          const position=this.primary.offset+now-this.primary.start;
          if(position<this.bank.duration-.06){this.section=this.sectionFor(position+.02);this.plan=null;return;}
          this.dispose();this.primary=this.createDeck(now+.1,0,.06);this.section=this.nav.sections[0];this.mixer.start=this.primary.start;this.visit('late-restart');return;
        }
      }
    }
    if(now>=plan.at){
      if(plan.kind==='natural'){this.section=plan.target;this.visit('natural');}
      else if(plan.deck){
        this.primary=plan.deck;this.section=plan.target;this.mixer.start=this.primary.start-this.primary.offset;
        this.lastJumpAt=plan.at;this.jumps++;if(plan.edge)this.lastEdge=plan.edge;if(plan.kind==='wrap')this.loops++;
        this.visit(plan.kind);
      }
      this.plan=null;
    }
    for(const deck of [...this.decks])if(deck!==this.primary&&deck!==this.plan?.deck&&now>(deck.stopAt??deck.end)+.025)this.disposeDeck(deck);
  }
}

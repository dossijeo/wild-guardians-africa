import {json,bytes} from '../rendering/assets.js';
import {MUSIC_POLICIES,gameplayMusicScene} from './music-policy.js';
import {MusicMixer} from './music-mixer.js';
import {MusicTransport} from './music-transport.js';
export const eventSound={TutorialMessageStarted:'spirit_tutorial_cue',PlacementCommitted:'build_place',WallChainBuilt:'build_place',WallRemoved:'build_demolish_manual',CropPlaced:'farm_seeds_drop',WaterSatisfied:'farm_watering_can',CropPicked:'farm_harvest_pick',CrateDelivered:'eco_crop_sold',CrateDropped:'farm_crate_move',HarvestRequested:'ui_click',HiringConfirmed:'ui_confirm',RaidSpawned:'game_attack_alert',RaidEnded:'game_attack_over',SpellActivated:'spirit_power_activate',RepairApplied:'build_repair',StructureHit:'beast_hit_structure',StructureRuined:'wall_collapse_full',WorkerHit:'npc_hit',WorkerIncapacitated:'npc_fall',CampaignWon:'game_victory',GameOver:'game_major_loss'};
export const SFX_LIMITS=Object.freeze({total:20,perFamily:4});
export const soundPriority=id=>['game_victory','game_major_loss'].includes(id)?4:['game_attack_alert','npc_fall'].includes(id)?3:['spirit_tutorial_cue','spirit_power_activate','game_attack_over'].includes(id)?2:1;
export class AudioSystem {
  constructor(settings,resources={json,bytes}){this.settings=settings;this.resources=resources;this.active=[];this.voices=new Map();this.buffers=new Map();this.seen=new Set();this.loops=new Map();this.generation=0;}
  async unlock() {
    this.context??=new AudioContext();await this.context.resume();
    if(!this.sfxGain){this.sfxGain=this.context.createGain();this.sfxGain.connect(this.context.destination);this.musicGain=this.context.createGain();this.musicGain.connect(this.context.destination);}
    this.volume();
  }
  volume(){if(this.sfxGain)this.sfxGain.gain.value=this.settings.sfx;if(this.musicGain)this.musicGain.gain.value=this.settings.music;}
  async buffer(url){
    if(!this.buffers.has(url)){
      const pending=Promise.resolve().then(()=>this.resources.bytes(url)).then(data=>this.context.decodeAudioData(data));
      this.buffers.set(url,pending);
      pending.catch(()=>{if(this.buffers.get(url)===pending)this.buffers.delete(url);});
    }
    return this.buffers.get(url);
  }
  async sfxBank(){
    if(this.sfx)return this.sfx;
    if(!this.sfxPromise){
      const pending=Promise.resolve().then(()=>this.resources.json('/content/sfx.json')).then(bank=>{this.sfx=bank;return bank;});
      this.sfxPromise=pending;const clear=()=>{if(this.sfxPromise===pending)this.sfxPromise=null;};pending.then(clear,clear);
    }
    return this.sfxPromise;
  }
  releaseVoice(source){
    const voice=this.voices.get(source);if(!voice)return;
    this.voices.delete(source);this.active=this.active.filter(s=>s!==source);source.disconnect();voice.volume.disconnect();
  }
  stopVoice(source){try{source.stop();}catch{}this.releaseVoice(source);}
  startBuffer(buffer,{loop=false,music=false,gain=1,priority=1,family='generic',when,loopEnd,destination,offset=0,stopAt}={}){
    if(!this.context||this.context.state!=='running')return null;
    if(!music){
      const voices=[...this.voices].filter(([,v])=>!v.music),same=voices.filter(([,v])=>v.family===family);
      const pool=same.length>=SFX_LIMITS.perFamily?same:voices.length>=SFX_LIMITS.total?voices:null;
      if(pool){const candidate=pool.sort((a,b)=>a[1].priority-b[1].priority)[0];if(candidate[1].priority>=priority)return null;this.stopVoice(candidate[0]);}
    }
    const source=this.context.createBufferSource(),volume=this.context.createGain();source.buffer=buffer;source.loop=loop;if(loopEnd!==undefined)source.loopEnd=loopEnd;
    // Simulation speed changes event cadence, never the sample clock or pitch.
    source.playbackRate.value=1;volume.gain.value=gain;source.connect(volume);volume.connect(destination??(music?this.musicGain:this.sfxGain));
    this.voices.set(source,{volume,music,priority,family});this.active.push(source);source.onended=()=>this.releaseVoice(source);
    try{source.start(when,offset);if(stopAt!==undefined)source.stop(stopAt);}catch(error){this.stopVoice(source);throw error;}return source;
  }
  async play(url,options={}) {
    if(!this.context||this.context.state!=='running')return null;
    const generation=this.generation,buffer=await this.buffer(url);
    if(generation!==this.generation||this.context.state!=='running')return null;
    return this.startBuffer(buffer,options);
  }
  async menu(){
    const request=this.generation;await this.unlock();if(request!==this.generation)return;
    this.stop();const generation=this.generation,data=await this.resources.json('/content/menu.json');
    if(generation!==this.generation)return;
    if(data.music)await this.play(data.music,{loop:true,music:true,gain:.7});
  }
  async gameplay(day) {
    if(!this.context||this.context.state!=='running')return;
    const pack=day%2?'a':'b';if(this.pack===pack)return;
    this.stop();this.musicError=null;this.pack=pack;const generation=this.generation;
    try{
      await this.sfxBank();if(this.pack!==pack||generation!==this.generation)return;
      const bank=await this.resources.json(`/content/music-${pack}.json`);
      if(this.pack!==pack||generation!==this.generation)return;
      // Schedule original synchronized stems on one WebAudio clock, one pack at a time.
      const loaded=await Promise.all(bank.tracks.filter(t=>!t.silent).map(async t=>({track:t,buffer:await this.buffer(t.data.url)})));
      if(this.pack!==pack||generation!==this.generation)return;
      if(this.context.state!=='running'){this.pack=null;return;}
      if(bank.navigation?.sections?.length){this.transport=new MusicTransport(this,pack,bank,loaded,this.resources.musicTransport);return;}
      const when=this.context.currentTime+.1;
      const scene=this.musicScene??'day',policy=MUSIC_POLICIES[pack],voices=new Map();
      for(const {track,buffer} of loaded){
        const index=bank.tracks.indexOf(track),level=track.id?policy.levels[scene][index]:1;
        const source=this.startBuffer(buffer,{loop:true,music:true,loopEnd:bank.duration,gain:(bank.safetyGain??.5)*.45*level,when});
        if(source&&track.id)voices.set(track.id,this.voices.get(source).volume.gain);
      }
      if(voices.size)this.mixer=new MusicMixer(pack,bank,voices,when,scene,{automatic:true});
    }catch(error){if(this.pack===pack&&generation===this.generation)this.stop();throw error;}
  }
  updateMusic(state){
    this.musicScene=gameplayMusicScene(state);
    if(this.context?.state==='running'){try{if(this.transport)this.transport.update(this.musicScene,this.context.currentTime);else this.mixer?.update(this.musicScene,this.context.currentTime);if(this.musicEvent&&this.mixer){this.mixer.triggerEvent(this.musicEvent,this.context.currentTime);this.musicEvent=null;}}catch(error){this.stop();this.musicError=error;}}
  }
  async sound(id) {
    if(!this.context||this.context.state!=='running')return null;const generation=this.generation;await this.sfxBank();if(generation!==this.generation)return null;const item=this.sfx.items.find(i=>i.id===id);if(item&&!item.loop)return this.play(item.audio.url,{priority:soundPriority(id),family:id});return null;
  }
  process(events){for(const event of events){if(this.seen.has(event.id))continue;this.seen.add(event.id);if(event.type==='CampaignWon')this.musicEvent='success';if(event.type==='GameOver')this.musicEvent='failure';const id=eventSound[event.type];if(id)this.sound(id).catch(()=>{});}if(this.seen.size>2000)this.seen=new Set(events.map(e=>e.id));}
  remember(events){this.seen=new Set(events.map(event=>event.id));}
  stop(){this.transport?.dispose();this.transport=null;this.mixer=null;this.musicEvent=null;this.generation++;for(const source of [...this.active])this.stopVoice(source);this.active=[];this.pack=null;}
  suspend(){this.context?.suspend();}resume(){this.context?.resume().catch(()=>{});}dispose(){this.stop();this.context?.close();}
}

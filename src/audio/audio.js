import {structureHitSound,STRUCTURE_CONTACT_FAMILY} from './structure-audio.js';
import {WorkAudio} from './work-audio.js';
import {AmbientAudio} from './ambient-audio.js';
import {MovementAudio} from './movement-audio.js';
import {json,bytes} from '../rendering/assets.js';
import {MUSIC_POLICIES,gameplayMusicScene} from './music-policy.js';
import {MusicMixer} from './music-mixer.js';
import {MusicTransport} from './music-transport.js';
export const eventSound={TutorialMessageStarted:'spirit_tutorial_cue',PlacementCommitted:'build_place',WallChainBuilt:'build_place',WallRemoved:'build_demolish_manual',CropPlaced:'farm_seeds_drop',CropPicked:'farm_harvest_pick',CrateDelivered:'eco_crop_sold',CrateDropped:'farm_crate_move',HarvestRequested:'ui_click',HiringConfirmed:'ui_confirm',RaidSpawned:'game_attack_alert',RaidEnded:'game_attack_over',SpellActivated:'spirit_power_activate',RepairApplied:'build_repair',StructureHit:'beast_hit_structure',StructureRuined:'wall_collapse_full',WorkerHit:'npc_hit',WorkerIncapacitated:'npc_fall',CampaignWon:'game_victory',GameOver:'game_major_loss'};
export const SFX_LIMITS=Object.freeze({total:20,perFamily:4,perEmitter:2});
export const soundPriority=id=>/^(step_|run_surface_set|beast_step_)/.test(id)?0:['game_victory','game_major_loss'].includes(id)?4:['game_attack_alert','npc_fall'].includes(id)?3:['spirit_tutorial_cue','spirit_power_activate','game_attack_over'].includes(id)?2:1;
export const soundBus=id=>id.startsWith('amb_')?'ambient':/^(ui_|game_|eco_|spirit_tutorial)/.test(id)?'ui':'world';
export function eventAudioOptions(event,id,state,listener){
  const bus=soundBus(id);if(bus!=='world')return {bus};
  const emitter=event.workerId??(event.type.startsWith('Worker')?event.targetId:event.animalId??event.targetId);
  let entity=event.presentation;
  if(!entity&&state)for(const list of [state.workers,state.raid?.animals,state.structures,state.plants,state.crates]){entity=list?.find(e=>e.id===emitter);if(entity)break;}
  const distance=entity&&listener?Math.hypot(entity.x-listener.x,entity.z-listener.z):0;
  return {bus,emitter,gain:Number.isFinite(distance)?1/(1+(distance/24)**2):1};
}
export class AudioSystem {
  constructor(settings,resources={json,bytes}){this.settings=settings;this.resources=resources;this.active=[];this.voices=new Map();this.buffers=new Map();this.seen=new Set();this.loops=new Map();this.generation=0;this.musicGeneration=0;this.musicBuffers=new Set();this.musicRetryAt=0;this.menuActive=false;}
  async unlock() {
    this.context??=new AudioContext();await this.context.resume();
    if(!this.sfxGain){this.sfxGain=this.context.createGain();this.sfxGain.connect(this.context.destination);this.musicGain=this.context.createGain();this.musicGain.connect(this.context.destination);}
    if(!this.sfxBuses){this.sfxBuses={};for(const name of ['ambient','world','ui']){const node=this.context.createGain();node.gain.value=1;node.connect(this.sfxGain);this.sfxBuses[name]=node;}}
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
  startBuffer(buffer,{loop=false,music=false,gain=1,priority=1,family='generic',emitter,bus='world',when,loopEnd,destination,offset=0,stopAt}={}){
    if(!this.context||this.context.state!=='running')return null;
    if(!music){
      // Plan admission after decode. Check every limit before stopping any voice:
      // a rejected cue must not partially evict an unrelated sound.
      let voices=[...this.voices].filter(([,v])=>!v.music);const evicted=[];
      while(true){
        const same=voices.filter(([,v])=>v.family===family),local=emitter==null?[]:voices.filter(([,v])=>v.emitter===emitter);
        const pool=local.length>=SFX_LIMITS.perEmitter?local:same.length>=SFX_LIMITS.perFamily?same:voices.length>=SFX_LIMITS.total?voices:null;
        if(!pool)break;
        const candidate=pool.sort((a,b)=>a[1].priority-b[1].priority)[0];
        if(candidate[1].priority>=priority)return null;
        evicted.push(candidate[0]);voices=voices.filter(([source])=>source!==candidate[0]);
      }
      for(const source of evicted)this.stopVoice(source);
    }
    const source=this.context.createBufferSource(),volume=this.context.createGain();source.buffer=buffer;source.loop=loop;if(loopEnd!==undefined)source.loopEnd=loopEnd;
    // Simulation speed changes event cadence, never the sample clock or pitch.
    source.playbackRate.value=1;volume.gain.value=gain;source.connect(volume);volume.connect(destination??(music?this.musicGain:this.sfxBuses?.[bus]??this.sfxGain));
    this.voices.set(source,{volume,music,priority,family,emitter,bus});this.active.push(source);source.onended=()=>this.releaseVoice(source);
    try{source.start(when,offset);if(stopAt!==undefined)source.stop(stopAt);}catch(error){this.stopVoice(source);throw error;}return source;
  }
  async play(url,options={}) {
    if(!this.context||this.context.state!=='running')return null;
    const generation=this.generation,musicGeneration=this.musicGeneration;if(options.music)this.musicBuffers.add(url);const buffer=await this.buffer(url);
    if(generation!==this.generation||options.music&&musicGeneration!==this.musicGeneration||this.context.state!=='running'||options.isCurrent&&!options.isCurrent())return null;
    return this.startBuffer(buffer,options);
  }
  async menu(){
    const request=this.generation;await this.unlock();if(request!==this.generation||this.menuActive)return;
    this.stop();this.menuActive=true;const generation=this.generation,musicGeneration=this.musicGeneration;
    try{
      const data=await this.resources.json('/content/menu.json');
      if(generation!==this.generation||musicGeneration!==this.musicGeneration)return;
      if(data.music){const source=await this.play(data.music,{loop:true,music:true,gain:.7});if(!source&&musicGeneration===this.musicGeneration)this.stopMusic();}
    }catch(error){if(musicGeneration===this.musicGeneration){this.stopMusic();this.musicError=error;}throw error;}
  }
  stopMusic({preserveEvent=false}={}){
    this.musicGeneration++;this.transport?.dispose();this.transport=null;this.mixer=null;if(!preserveEvent)this.musicEvent=null;
    for(const [source,voice] of [...this.voices])if(voice.music)this.stopVoice(source);
    for(const url of this.musicBuffers)this.buffers.delete(url);this.musicBuffers.clear();this.pack=null;this.menuActive=false;
  }
  async gameplay(day) {
    if(!this.context||this.context.state!=='running')return;
    const pack=day%2?'a':'b';if(this.pack===pack)return;
    this.stopMusic({preserveEvent:true});this.musicError=null;this.pack=pack;const generation=this.musicGeneration;
    try{
      await this.sfxBank();if(this.pack!==pack||generation!==this.musicGeneration)return;
      const bank=await this.resources.json(`/content/music-${pack}.json`);
      if(this.pack!==pack||generation!==this.musicGeneration)return;
      // Keep only the current original pack decoded; the transport owns its decks.
      const loaded=await Promise.all(bank.tracks.filter(t=>!t.silent).map(async t=>{this.musicBuffers.add(t.data.url);return {track:t,buffer:await this.buffer(t.data.url)};}));
      if(this.pack!==pack||generation!==this.musicGeneration)return;
      if(this.context.state!=='running'){this.stopMusic({preserveEvent:true});return;}
      this.musicRetryAt=0;
      if(bank.navigation?.sections?.length){this.transport=new MusicTransport(this,pack,bank,loaded,this.resources.musicTransport);return;}
      const when=this.context.currentTime+.1;
      const scene=this.musicScene??'day',policy=MUSIC_POLICIES[pack],voices=new Map();
      for(const {track,buffer} of loaded){
        const index=bank.tracks.indexOf(track),level=track.id?policy.levels[scene][index]:1;
        const source=this.startBuffer(buffer,{loop:true,music:true,loopEnd:bank.duration,gain:(bank.safetyGain??.5)*.45*level,when});
        if(source&&track.id)voices.set(track.id,this.voices.get(source).volume.gain);
      }
      if(voices.size)this.mixer=new MusicMixer(pack,bank,voices,when,scene,{automatic:true});
    }catch(error){if(this.pack===pack&&generation===this.musicGeneration){this.stopMusic({preserveEvent:true});this.musicError=error;this.musicRetryAt=this.context.currentTime+2;}throw error;}
  }
  updateMusic(state){
    this.musicScene=gameplayMusicScene(state);
    if(this.context?.state==='running'){
      const pack=state.day%2?'a':'b';if(Number.isSafeInteger(state.day)&&state.day>0&&!state.result&&this.pack!==pack&&this.context.currentTime>=this.musicRetryAt)this.gameplay(state.day).catch(()=>{});
      try{if(this.transport)this.transport.update(this.musicScene,this.context.currentTime);else this.mixer?.update(this.musicScene,this.context.currentTime);if(this.musicEvent&&this.mixer){this.mixer.triggerEvent(this.musicEvent,this.context.currentTime);this.musicEvent=null;}}catch(error){this.stopMusic({preserveEvent:true});this.musicError=error;this.musicRetryAt=this.context.currentTime+2;}
    }
  }
  async sound(id,options={}) {
    if(!this.context||this.context.state!=='running')return null;const generation=this.generation;await this.sfxBank();if(generation!==this.generation)return null;const item=this.sfx.items.find(i=>i.id===id);if(item&&!item.loop)return this.play(item.audio.url,{bus:soundBus(id),...options,priority:soundPriority(id),family:options.family??id});return null;
  }
  async ambientSound(id,options={}){
    if(this.context?.state!=='running')return null;const generation=this.generation;await this.sfxBank();if(generation!==this.generation)return null;
    const item=this.sfx.items.find(i=>i.id===id);return item?.loop?this.play(item.audio.url,{...options,loop:true,bus:'ambient',family:id,priority:0}):null;
  }
  updateAmbient(state,options={}){
    if(this.context?.state!=='running')return;
    this.ambient??=new AmbientAudio((id,opts)=>this.ambientSound(id,opts),source=>this.stopVoice(source),(source,value)=>{const gain=this.voices.get(source)?.volume.gain;if(gain){if(gain.setTargetAtTime)gain.setTargetAtTime(value,this.context.currentTime,.08);else gain.value=value;}},()=>this.context.currentTime);this.ambient.update(state,options);
  }
  process(events,{state,listener}={}){for(const event of events){if(this.seen.has(event.id))continue;this.seen.add(event.id);if(event.type==='CampaignWon')this.musicEvent='success';if(event.type==='GameOver')this.musicEvent='failure';const id=event.type==='StructureHit'?structureHitSound(event,state):eventSound[event.type];if(id)this.sound(id,{...eventAudioOptions(event,id,state,listener),...(event.type==='StructureHit'?{family:STRUCTURE_CONTACT_FAMILY}:{})}).catch(()=>{});}if(this.seen.size>2000)this.seen=new Set(events.map(e=>e.id));}
  updateWork(state,options={}){
    if(this.context?.state!=='running'){this.work?.dispose();return;}
    this.work??=new WorkAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source));this.work.update(state,options);
  }
  updateMovement(state,options={}){
    if(this.context?.state!=='running'){this.movement?.dispose();return;}
    this.movement??=new MovementAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime);this.movement.update(state,options);
  }
  remember(events){this.seen=new Set(events.map(event=>event.id));}
  stop(){this.work?.dispose();this.ambient?.dispose();this.movement?.dispose();this.stopMusic();this.musicRetryAt=0;this.generation++;for(const source of [...this.active])this.stopVoice(source);this.active=[];this.pack=null;}
  suspend(){this.work?.dispose();this.movement?.dispose();this.context?.suspend();}resume(){this.context?.resume().catch(()=>{});}dispose(){this.stop();for(const node of Object.values(this.sfxBuses??{}))node.disconnect();this.sfxGain?.disconnect?.();this.musicGain?.disconnect?.();this.context?.close();}
}

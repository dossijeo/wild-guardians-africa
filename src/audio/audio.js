import {PowerReadyAudio} from './power-ready-audio.js';
import {destructionSounds} from './destruction-audio.js';
import {UnlockAudio} from './unlock-audio.js';
import {GuardianAudio} from './guardian-audio.js';
import {WorkerAudio} from './worker-audio.js';
import {FarmContactAudio} from './farm-contact-audio.js';
import {RaidArrivalAudio} from './raid-arrival-audio.js';
import {AnimalAudio,ANIMAL_SOUND_ROUTES} from './animal-audio.js';
import {wallBuildSound,structureHitSound,structureAlertSound,structureDetailSound,STRUCTURE_CONTACT_FAMILY} from './structure-audio.js';
import {WorkAudio} from './work-audio.js';
import {AmbientAudio} from './ambient-audio.js';
import {MovementAudio} from './movement-audio.js';
import {json,bytes} from '../rendering/asset-fetch.js';
import {MUSIC_POLICIES,gameplayMusicScene} from './music-policy.js';
import {MusicMixer} from './music-mixer.js';
import {MusicTransport} from './music-transport.js';
import {MusicLoadQueue} from './music-load-queue.js';
import {MusicStream} from './music-stream.js';
import {prepareMusicDiskCache} from './music-disk-cache.js';
import {startWindowMusic} from './start-window-music.js';
export const eventSound={TutorialMessageStarted:'spirit_tutorial_cue',PlacementCommitted:'build_place',WallChainBuilt:'build_place',WallRemoved:'build_demolish_manual',CropPlaced:'ui_buy',CropPicked:'farm_crop_to_crate',CrateDelivered:'eco_crop_sold',CrateDropped:'farm_crate_move',HarvestRequested:'ui_click',HiringConfirmed:'ui_confirm',RaidSpawned:'game_attack_alert',RaidEnded:'game_attack_over',SpellActivated:'spirit_power_activate',RepairApplied:'build_repair',StructureHit:'beast_hit_structure',StructureRuined:'wall_collapse_full',WorkerHit:'npc_hit',WorkerIncapacitated:'npc_fall',CampaignWon:'game_victory',GameOver:'game_major_loss',PostgameStarted:'ui_unlock'};
export const eventExtraSound=Object.freeze({PlacementCommitted:'build_complete',WallChainBuilt:'build_complete',VillageFounded:'build_complete',WorkerHit:'beast_hit_character',WorkerIncapacitated:'beast_hit_character'});
export const eventAlertSound=Object.freeze({WorkerIncapacitated:'game_farmer_hurt',TutorialCompleted:'ui_objective_complete'});
export const eventRefundSound=Object.freeze({WallRemoved:'eco_gain'});
export const SFX_LIMITS=Object.freeze({total:20,perFamily:4,perEmitter:2});
export const soundPriority=id=>/^(step_|run_surface_set|beast_step_)/.test(id)?0:['game_victory','game_major_loss'].includes(id)?4:['game_attack_alert','game_enemy_detected','game_building_attacked','game_wall_critical','game_farmer_hurt','npc_fall'].includes(id)?3:['spirit_tutorial_cue','spirit_power_activate','game_attack_over','beast_hit_character'].includes(id)?2:1;
export const soundBus=id=>id.startsWith('amb_')?'ambient':/^(ui_|game_|eco_|spirit_tutorial)/.test(id)?'ui':'world';
export function eventAudioOptions(event,id,state,listener){
  const bus=soundBus(id);if(bus!=='world')return id==='ui_unlock'?{bus,emitter:'ui:unlock'}:{bus};
  const emitter=id==='beast_hit_character'?event.animalId??event.targetId:event.workerId??(event.type.startsWith('Worker')?event.targetId:event.animalId??event.targetId);
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
  async buffer(url,{current=()=>true}={}){
    if(!this.buffers.has(url)){
      const pending=Promise.resolve().then(async()=>{
        if(!current())return null;
        const data=await this.resources.bytes(url);
        return current()?this.context.decodeAudioData(data):null;
      });
      this.buffers.set(url,pending);
      pending.catch(()=>{if(this.buffers.get(url)===pending)this.buffers.delete(url);});
      pending.then(result=>{if(result===null&&this.buffers.get(url)===pending)this.buffers.delete(url);},()=>{});
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
      if(data.music){
        if(this.resources.createMedia||typeof Audio!=='undefined'){
          await prepareMusicDiskCache();if(generation!==this.generation||musicGeneration!==this.musicGeneration)return;
          const stream=new MusicStream(this.context,this.musicGain,data.music,{createMedia:this.resources.createMedia});this.menuStream=stream;
          await stream.play();
          if(generation!==this.generation||musicGeneration!==this.musicGeneration)stream.dispose();
        }else{
          const source=await this.play(data.music,{loop:true,music:true,gain:.7});if(!source&&musicGeneration===this.musicGeneration)this.stopMusic();
        }
      }
    }catch(error){if(musicGeneration===this.musicGeneration){this.stopMusic();this.musicError=error;}throw error;}
  }
  stopMusic({preserveEvent=false}={}){
    this.menuStream?.dispose();this.menuStream=null;
    this.musicGeneration++;this.transport?.dispose();this.transport=null;this.mixer=null;if(!preserveEvent)this.musicEvent=null;
    this.musicWindowPool?.dispose();this.musicWindowPool=null;
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
      const current=()=>this.pack===pack&&generation===this.musicGeneration;
      this.musicLoads??=new MusicLoadQueue();
      // Prepared byte windows are validated at both common native rates.
      // Other rates retain the original route until their resampling is checked.
      if(bank.navigation?.sections?.length&&[44100,48000].includes(this.context.sampleRate)&&this.resources.musicWindows!==false){
        await startWindowMusic(this,pack,bank,current);return;
      }
      // Compatibility route: retain only the current pack's full PCM.
      const loaded=await Promise.all(bank.tracks.filter(t=>!t.silent).map(t=>{
        this.musicBuffers.add(t.data.url);
        return this.musicLoads.run(current,async()=>({track:t,buffer:await this.buffer(t.data.url,{current})}));
      }));
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
  destructionCue(counts,entity,{state,listener}={}){
    if(this.context?.state!=='running'||state?.pauses?.length)return;
    const requested=this.context.currentTime,generation=this.generation;
    if(this.destructionTimesGeneration!==generation){this.destructionTimes=new Map();this.destructionTimesGeneration=generation;}
    for(const id of destructionSounds(counts)){
      this.destructionTimes??=new Map();const key=entity.id+':'+id;
      if(requested-(this.destructionTimes.get(key)??-Infinity)<.3)continue;
      this.destructionTimes.set(key,requested);
      // Keep only recent contacts; capacity stays bounded across long campaigns.
      if(this.destructionTimes.size>128){for(const [key,at] of this.destructionTimes)if(requested-at>=.3)this.destructionTimes.delete(key);while(this.destructionTimes.size>128)this.destructionTimes.delete(this.destructionTimes.keys().next().value);}
      const distance=listener?Math.hypot(entity.x-listener.x,entity.z-listener.z):0;
      this.sound(id,{bus:'world',family:'structure-debris',emitter:entity.id,gain:1/(1+(distance/24)**2),
        isCurrent:()=>generation===this.generation&&this.context?.state==='running'&&this.context.currentTime-requested<=.5&&!state?.pauses?.length}).catch(()=>{});
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
  process(events,{state,listener}={}){
    let start=0;
    // Game.emit appends and shifts this bounded history. Stable frames inspect
    // one anchor; a shifted history searches only when there are new facts.
    if(events===this.eventHistory&&this.eventCursor>0){
      if(events[this.eventCursor-1]===this.eventAnchor)start=this.eventCursor;
      else {const previous=events.lastIndexOf(this.eventAnchor);if(previous>=0)start=previous+1;}
    }
    let alerts;
    for(let index=start;index<events.length;index++){
      const event=events[index];if(this.seen.has(event.id))continue;this.seen.add(event.id);
      // Automatic harvest only queues worker work; it is not a player click.
      // Consume its ID normally so history changes cannot replay it later.
      if(event.type==='HarvestRequested'&&event.automatic===true)continue;
      if(event.type==='CampaignWon')this.musicEvent='success';if(event.type==='GameOver')this.musicEvent='failure';
      const id=event.type==='StructureHit'?structureHitSound(event,state):wallBuildSound(event)??eventSound[event.type];
      const requested=this.context?.currentTime??0,generation=this.generation;
      const constructionOptions=event.type==='WallChainBuilt'?{family:'construction-place',isCurrent:()=>generation===this.generation&&this.context?.state==='running'&&this.context.currentTime-requested<=.5&&!state?.pauses?.some(p=>['menu','hidden','context-lost','runtime-error'].includes(p))}:{};
      if(id)this.sound(id,{...eventAudioOptions(event,id,state,listener),...constructionOptions,...(event.type==='StructureHit'?{family:STRUCTURE_CONTACT_FAMILY}:{})}).catch(()=>{});
      const alert=event.type==='StructureHit'?structureAlertSound(event):eventAlertSound[event.type];
      if(alert&&!(alerts??=new Set()).has(alert)){alerts.add(alert);const requested=this.context?.currentTime??0,generation=this.generation;
        this.sound(alert,{bus:'ui',family:alert==='ui_objective_complete'?'tutorial-complete':alert==='game_farmer_hurt'?'worker-danger':'structure-danger',emitter:alert==='ui_objective_complete'?'ui:tutorial':alert==='game_farmer_hurt'?'ui:worker-danger':'ui:structure-danger',gain:1,
          isCurrent:()=>generation===this.generation&&this.context?.state==='running'&&(this.context.currentTime-requested)<=.5&&
            !state?.pauses?.some(p=>['menu','hidden','context-lost','runtime-error'].includes(p))}).catch(()=>{});
      }
      const detail=event.type==='StructureHit'&&structureDetailSound(event,state);
      if(detail){const requested=this.context?.currentTime??0,generation=this.generation;
        this.sound(detail,{...eventAudioOptions({...event,animalId:undefined,presentation:Number.isFinite(event.structureHit.x)&&Number.isFinite(event.structureHit.z)?event.structureHit:event.presentation},detail,state,listener),family:'structure-detail',emitter:event.targetId,
          isCurrent:()=>generation===this.generation&&this.context?.state==='running'&&this.context.currentTime-requested<=.5&&
            !state?.pauses?.some(p=>['menu','hidden','context-lost','runtime-error'].includes(p))}).catch(()=>{});
      }
      const extra=eventExtraSound[event.type];if(extra)this.sound(extra,{...eventAudioOptions(event,extra,state,listener),...constructionOptions,family:extra==='beast_hit_character'?'beast-worker-contact':'construction-complete'}).catch(()=>{});
      const refund=eventRefundSound[event.type];
      if(refund&&Number.isFinite(event.refund)&&event.refund>0)this.sound(refund,{bus:'ui',family:'economic-refund',emitter:'ui:refund',
        isCurrent:()=>generation===this.generation&&this.context?.state==='running'&&this.context.currentTime-requested<=.5&&
          !state?.pauses?.some(p=>['menu','hidden','context-lost','runtime-error'].includes(p))}).catch(()=>{});
    }
    this.eventHistory=events;this.eventCursor=events.length;this.eventAnchor=events.at(-1);
    if(this.seen.size>2000)this.seen=new Set(events.map(e=>e.id));
  }
  preparePowerReadySound(state){
    if(this.context?.state!=='running'||state.result||state.pauses?.length||!Object.values(state.cooldowns??{}).some(value=>value>0))return;
    if(this.powerReadyPreparation||this.context.currentTime<(this.powerReadyRetryAt??0))return;
    const generation=this.generation,current=()=>generation===this.generation&&this.context?.state==='running';
    // Fetch and decode during the cooldown, before the short freshness window
    // of the ready cue. Preparation never creates an audible source.
    const pending=this.sfxBank().then(bank=>{
      if(!current())return null;
      const item=bank.items.find(item=>item.id==='spirit_power_charge');
      return item?this.buffer(item.audio.url,{current}):null;
    });
    this.powerReadyPreparation=pending;
    const retry=()=>{if(this.powerReadyPreparation===pending){this.powerReadyPreparation=null;this.powerReadyRetryAt=(this.context?.currentTime??0)+5;}};
    pending.then(buffer=>{if(!buffer)retry();},retry);
  }
  updateUnlocks(state){
    if(this.context?.state!=='running'){this.unlocks?.dispose();this.powerReady?.dispose();return;}
    this.preparePowerReadySound(state);
    this.unlocks??=new UnlockAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime);this.unlocks.update(state);
    this.powerReady??=new PowerReadyAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime);this.powerReady.update(state);
  }
  guardianPhase(phase){
    this.guardianAudio??=new GuardianAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context?.currentTime??0);
    if(this.context?.state!=='running'){this.guardianAudio.suspend();return;}this.guardianAudio.observe(phase);
  }
  updateWorkers(state,options={}){
    if(this.context?.state!=='running'){this.workers?.dispose();return;}
    this.workers??=new WorkerAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime);this.workers.update(state,options);
  }
  updateFarmActors(state,options={}){
    if(this.context?.state!=='running'||state.pauses?.length||state.result||!state.workers.some(worker=>worker.status==='acting')){
      this.updateWorkers(state,options);this.updateWork(state,options);this.updateFarm(state,options);return;
    }
    // These presentation updates are synchronous and do not mutate gameplay.
    // Share one lazy lookup only within this call, never by elapsed time: UI
    // commands may replace tasks without advancing the simulation clock.
    let tasks;const frameOptions={...options,tasksForFrame:()=>tasks??=new Map(state.tasks.map(task=>[task.id,task]))};
    this.updateWorkers(state,frameOptions);this.updateWork(state,frameOptions);this.updateFarm(state,frameOptions);
  }
  updateWork(state,options={}){
    if(this.context?.state!=='running'){this.work?.dispose();return;}
    this.work??=new WorkAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source));this.work.update(state,options);
  }
  updateFarm(state,options={}){
    if(this.context?.state!=='running'){this.farm?.dispose();return;}
    this.farm??=new FarmContactAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime);this.farm.update(state,options);
  }
  updateAnimals(state,options={}){
    if(this.context?.state!=='running'){this.raidArrival?.dispose();this.animals?.dispose();return;}
    this.raidArrival??=new RaidArrivalAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime);this.raidArrival.update(state);
    this.prepareAnimalSounds(state);
    this.animals??=new AnimalAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime,(source,gain)=>{this.voices.get(source)?.volume.gain.setTargetAtTime(gain,this.context.currentTime,.025);});this.animals.update(state,options);
  }
  prepareAnimalSounds(state){
    const species=state.nightPlan?.group??(!state.postgame&&state.day<=5?['warthog','hyena','buffalo','lion','rhino'].slice(state.day-1,state.day):[]);
    this.animalSoundPreparation??=new Map();
    for(const id of new Set([...species,...(state.raid?.animals.map(a=>a.species)??[])])){
      if(this.animalSoundPreparation.has(id))continue;
      const pending=this.sfxBank().then(bank=>Promise.all([...Object.values(ANIMAL_SOUND_ROUTES[id]??{}),'game_enemy_detected'].map(sound=>{const item=bank.items.find(i=>i.id===sound);return item?this.buffer(item.audio.url):null;})));
      this.animalSoundPreparation.set(id,pending);pending.catch(()=>{if(this.animalSoundPreparation.get(id)===pending)this.animalSoundPreparation.delete(id);});
    }
  }
  updateMovement(state,options={}){
    if(this.context?.state!=='running'){this.movement?.dispose();return;}
    this.movement??=new MovementAudio((id,opts)=>this.sound(id,opts),source=>this.stopVoice(source),()=>this.context.currentTime);this.movement.update(state,options);
  }
  remember(events){this.seen=new Set(events.map(event=>event.id));this.eventHistory=events;this.eventCursor=events.length;this.eventAnchor=events.at(-1);}
  stop(){this.powerReadyPreparation=null;this.powerReadyRetryAt=0;this.powerReady?.dispose();this.raidArrival?.dispose();this.unlocks?.dispose();this.guardianAudio?.dispose();this.workers?.dispose();this.farm?.dispose();this.animals?.dispose();this.work?.dispose();this.ambient?.dispose();this.movement?.dispose();this.stopMusic();this.musicRetryAt=0;this.generation++;for(const source of [...this.active])this.stopVoice(source);this.active=[];this.pack=null;}
  suspend(){this.powerReady?.dispose();this.raidArrival?.dispose();this.menuStream?.pause();this.unlocks?.dispose();this.guardianAudio?.suspend();this.workers?.dispose();this.farm?.dispose();this.animals?.dispose();this.work?.dispose();this.movement?.dispose();this.context?.suspend();}
  resume(){this.context?.resume().then(()=>this.menuStream?.play()).catch(error=>{this.musicError=error;});}
  dispose(){this.stop();for(const node of Object.values(this.sfxBuses??{}))node.disconnect();this.sfxGain?.disconnect?.();this.musicGain?.disconnect?.();this.context?.close();}
}

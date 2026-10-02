import {json,bytes} from '../rendering/assets.js';
export const eventSound={TutorialMessageStarted:'spirit_tutorial_cue',PlacementCommitted:'build_place',CropPlaced:'farm_seeds_drop',WaterSatisfied:'farm_watering_can',CropPicked:'farm_harvest_pick',CrateDelivered:'eco_crop_sold',CrateDropped:'farm_crate_move',HarvestRequested:'ui_click',HiringConfirmed:'ui_confirm',RaidSpawned:'game_attack_alert',RaidEnded:'game_attack_over',SpellActivated:'spirit_power_activate',RepairApplied:'build_repair',StructureHit:'beast_hit_structure',StructureRuined:'wall_collapse_full',WorkerHit:'npc_hit',WorkerIncapacitated:'npc_fall',CampaignWon:'game_victory',GameOver:'game_major_loss'};
export class AudioSystem {
  constructor(settings){this.settings=settings;this.active=[];this.buffers=new Map();this.seen=new Set();this.loops=new Map();this.generation=0;}
  async unlock() {
    this.context??=new AudioContext();await this.context.resume();
    if(!this.sfxGain){this.sfxGain=this.context.createGain();this.sfxGain.connect(this.context.destination);this.musicGain=this.context.createGain();this.musicGain.connect(this.context.destination);}
    this.volume();
  }
  volume(){if(this.sfxGain)this.sfxGain.gain.value=this.settings.sfx;if(this.musicGain)this.musicGain.gain.value=this.settings.music;}
  async buffer(url){if(!this.buffers.has(url))this.buffers.set(url,bytes(url).then(data=>this.context.decodeAudioData(data)));return this.buffers.get(url);}
  async play(url,{loop=false,music=false,gain=1}={}) {
    if(!this.context||this.context.state!=='running')return null;
    const generation=this.generation,buffer=await this.buffer(url);
    if(generation!==this.generation||this.context.state!=='running')return null;
    const source=this.context.createBufferSource(),volume=this.context.createGain();source.buffer=buffer;source.loop=loop;volume.gain.value=gain;source.connect(volume);volume.connect(music?this.musicGain:this.sfxGain);source.start();
    this.active.push(source);source.onended=()=>{this.active=this.active.filter(s=>s!==source);source.disconnect();volume.disconnect();};return source;
  }
  async menu(){await this.unlock();this.stop();const data=await json('/content/menu.json');if(data.music)await this.play(data.music,{loop:true,music:true,gain:.7});}
  async gameplay(day) {
    if(!this.context)return;
    const pack=day%2?'a':'b';if(this.pack===pack)return;
    this.stop();this.pack=pack;const generation=this.generation;this.sfx??=await json('/content/sfx.json');
    const bank=await json(`/content/music-${pack}.json`);
    // Schedule original synchronized stems on one WebAudio clock, one pack at a time.
    const loaded=await Promise.all(bank.tracks.filter(t=>!t.silent).map(async t=>({track:t,buffer:await this.buffer(t.data.url)})));
    if(this.pack!==pack||generation!==this.generation)return;const when=this.context.currentTime+.1;
    for(const {buffer} of loaded){const source=this.context.createBufferSource(),volume=this.context.createGain();source.buffer=buffer;source.loop=true;source.loopEnd=bank.duration;source.playbackRate.value=1;volume.gain.value=(bank.safetyGain??.5)*.45;source.connect(volume);volume.connect(this.musicGain);source.start(when);this.active.push(source);}
  }
  async sound(id) {
    this.sfx??=await json('/content/sfx.json');const item=this.sfx.items.find(i=>i.id===id);if(item&&!item.loop&&this.active.length<20)await this.play(item.audio.url);
  }
  process(events){for(const event of events){if(this.seen.has(event.id))continue;this.seen.add(event.id);const id=eventSound[event.type];if(id)this.sound(id).catch(()=>{});}if(this.seen.size>2000)this.seen=new Set(events.map(e=>e.id));}
  remember(events){this.seen=new Set(events.map(event=>event.id));}
  stop(){this.generation++;for(const source of this.active){try{source.stop();}catch{}}this.active=[];this.pack=null;}
  suspend(){this.context?.suspend();}resume(){this.context?.resume().catch(()=>{});}dispose(){this.stop();this.context?.close();}
}

export const AMBIENT_SOUND_IDS=Object.freeze(['amb_wind_soft','amb_birds','amb_insects','amb_night','amb_river','amb_coast_mangrove']);
export function ambientLayers(state,water){
  if(state.result)return [];
  const paused=state.pauses?.length ? .25 : 1,night=state.time>=300;
  const layers=[{key:'wind',id:'amb_wind_soft',gain:.35*paused},{key:'fauna',id:night?'amb_insects':'amb_birds',gain:.22*paused}];
  if(night)layers.push({key:'night',id:'amb_night',gain:.20*paused});
  const id=state.biome==='manglares'?'amb_coast_mangrove':['gran-rio','gran-canon'].includes(state.biome)?'amb_river':null;
  if(id&&water?.active&&Number.isFinite(water.shore)){
    const distance=water.inside?0:Math.max(0,water.shore),gain=.30/(1+(distance/12)**2)*paused;
    if(gain>.008)layers.push({key:'water',id,gain});
  }
  return layers;
}

export class AmbientAudio {
  constructor(play,stopVoice,setGain,clock){this.play=play;this.stopVoice=stopVoice;this.setGain=setGain;this.clock=clock;this.entries=new Map();this.fading=new Set();this.stateRef=null;this.waterKey=null;this.water=null;}
  retire(entry){entry.current=false;if(entry.source){this.setGain(entry.source,0);this.fading.add({source:entry.source,until:this.clock()+.4});}}
  update(state,{listener,waterAt,waterRevision=0}={}){
    if(this.stateRef&&this.stateRef!==state)this.dispose();this.stateRef=state;
    const now=this.clock();for(const fade of this.fading)if(now>=fade.until){this.stopVoice(fade.source);this.fading.delete(fade);}
    const waterBiome=['manglares','gran-rio','gran-canon'].includes(state.biome),key=waterBiome&&listener&&waterAt?`${state.biome}/${Math.floor(listener.x/4)}/${Math.floor(listener.z/4)}/${waterRevision}`:null;
    if(key!==this.waterKey){this.waterKey=key;this.water=key?waterAt(listener.x,listener.z):null;}
    const desired=new Map(ambientLayers(state,this.water).map(layer=>[layer.key,layer]));
    for(const [key,entry] of this.entries)if(!desired.has(key)||desired.get(key).id!==entry.id){this.retire(entry);this.entries.delete(key);}
    for(const [key,layer] of desired){
      let entry=this.entries.get(key);if(!entry){entry={...layer,current:true,pending:false,source:null,retryAt:0};this.entries.set(key,entry);}
      if(entry.gain!==layer.gain){entry.gain=layer.gain;if(entry.source)this.setGain(entry.source,layer.gain);}
      if(entry.source||entry.pending||now<entry.retryAt)continue;
      entry.pending=true;const isCurrent=()=>entry.current&&this.entries.get(key)===entry;
      Promise.resolve(this.play(entry.id,{loop:true,bus:'ambient',emitter:'ambient:'+key,gain:entry.gain,isCurrent})).then(source=>{
        if(!source)return;if(!isCurrent()){this.stopVoice(source);return;}entry.source=source;this.setGain(source,entry.gain);
        const ended=source.onended;source.onended=()=>{ended?.();if(entry.source===source)entry.source=null;entry.retryAt=this.clock()+1;};
      }).catch(()=>{}).finally(()=>{entry.pending=false;entry.retryAt=this.clock()+1;});
    }
  }
  dispose(){for(const entry of this.entries.values()){entry.current=false;if(entry.source)this.stopVoice(entry.source);}for(const fade of this.fading)this.stopVoice(fade.source);this.entries.clear();this.fading.clear();this.stateRef=null;this.waterKey=null;this.water=null;}
}

// Media decoding stays in the browser's streaming pipeline, outside AudioBuffer.
// A single menu track needs no sample-accurate alignment with other stems.
export class MusicStream {
  constructor(context,destination,url,{gain=.7,loop=true,createMedia=()=>new Audio()}={}){
    this.media=createMedia();this.media.preload='auto';this.media.crossOrigin='anonymous';
    this.media.loop=loop;this.media.playbackRate=1;this.disposed=false;
    try{
      this.source=context.createMediaElementSource(this.media);this.volume=context.createGain();
      this.volume.gain.value=gain;this.source.connect(this.volume);this.volume.connect(destination);
      this.media.src=url;
    }catch(error){this.dispose();throw error;}
  }
  async play(){if(this.disposed)return;await this.media.play();if(this.disposed)this.media.pause();}
  pause(){this.media.pause();}
  dispose(){
    if(this.disposed)return;this.disposed=true;this.media.pause();
    this.media.removeAttribute('src');this.media.load();this.source?.disconnect();this.volume?.disconnect();
  }
}

// Opt-in isolated-presentation QA; never imported by the application.
import {GpuTimer} from './gpu-timer.js';
import {BufferRequests} from './buffer-requests.js';
import {TextureRequests} from './texture-requests.js';
export class LoadingVisualCost {
  constructor(world, params) {
    this.world=world; this.mode=params.get('visual-cost'); this.frame=0; this.previous=null;
    this.records=[]; this.disposed=false; this.done=false; this.maxFrames=120+300+120;
    this.gl=world.renderer.getContext();
    this.timer=this.mode==='timing'?new GpuTimer(this.gl,32):null;
    this.buffers=this.mode==='resources'?new BufferRequests(this.gl):null;
    this.textures=this.mode==='resources'?new TextureRequests(this.gl):null;
    this.initial=this.resourceSnapshot();
  }
  get enabled(){return this.mode==='timing'||this.mode==='resources';}
  begin(now){
    if(!this.enabled||this.done||this.disposed)return null;
    const index=this.frame++, measured=index>=120&&index<420;
    const row={index,rafTimestamp:now,rafInterval:this.previous===null?null:now-this.previous,measured};
    this.previous=now; this.current=row;
    if(this.mode==='timing'){
      this.timer.poll();
      row.queryStarted=measured&&this.timer.begin(index);
    }
    row.cpuStart=performance.now();
    // Identical deterministic clock sequence in both arms; actual RAF is retained.
    return index===0?0:1/60;
  }
  afterDraw(){
    if(!this.current)return;
    this.current.drawCpuMs=performance.now()-this.current.cpuStart;
    if(this.current.queryStarted)this.timer.end();
    this.current.overlayStart=performance.now();
  }
  end(){
    if(!this.current)return;
    const row=this.current; row.overlayCpuMs=performance.now()-row.overlayStart;
    delete row.cpuStart;delete row.overlayStart;this.records.push(row);this.current=null;
    if(this.frame>=this.maxFrames){this.done=true;this.ready=this.resourceSnapshot();}
  }
  resourceSnapshot(){
    const info=this.world.renderer.info;
    return {buffers:this.buffers?.snapshot()??null,textures:this.textures?.snapshot()??null,
      renderer:{geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs.length},
      sampledHeap:performance.memory?.usedJSHeapSize??null};
  }
  report(){return {mode:this.mode,done:this.done,disposed:this.disposed,frame:this.frame,
    scope:'Isolated presentation. GPU wraps synchronous diorama draws only; CSS excluded. CPU draw/overlay are disjoint. All RAF intervals preserved. Resource probes invalidate timing. Sampled heap/requested storage are not physical peak RAM/VRAM.',
    initial:this.initial,ready:this.ready??null,afterDispose:this.afterDispose??null,
    gpu:this.timer?.report()??null,frames:this.records};}
  dispose(){
    if(this.disposed)return;this.disposed=true;
    // World disposal must precede this call so native deletion is observable.
    this.afterDispose=this.resourceSnapshot();this.timer?.dispose();
    this.buffers?.dispose();this.textures?.dispose();
  }
}

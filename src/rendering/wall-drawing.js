// Native Bastion gesture thresholds; screen input never mutates game state.
export class WallDrawing {
  constructor(canvas,{point,stroke,tap,screenSpace=false,preview=()=>{},gesture=()=>{},requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis)}){
    this.canvas=canvas;Object.assign(this,{point,stroke,tap,preview,gesture,screenSpace});this.enabled=false;this.pointers=new Map();this.samples=[];
    this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.previewFrame=null;
    this.handlers={pointerdown:e=>this.down(e),pointermove:e=>this.move(e),pointerup:e=>this.up(e),pointercancel:e=>this.up(e,true)};
    for(const [name,handler] of Object.entries(this.handlers))canvas.addEventListener(name,handler,{capture:true});
  }
  setEnabled(enabled){if(this.enabled&&!enabled)this.cancel();this.enabled=enabled;}
  get active(){return this.pointers.size>0;}
  consume(e){e.preventDefault();e.stopImmediatePropagation();}
  updatePreview(){
    if(!this.requestFrame){this.preview(this.samples);return;}
    if(this.previewFrame!==null)return;
    this.previewFrame=this.requestFrame(()=>{this.previewFrame=null;if(this.pointer&&!this.multi)this.preview(this.samples);});
  }
  clearPreview(){if(this.previewFrame!==null){this.cancelFrame?.(this.previewFrame);this.previewFrame=null;}this.preview([]);}
  down(e){
    if(!this.enabled||e.button!==0||e.shiftKey)return;
    this.consume(e);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.canvas.setPointerCapture(e.pointerId);
    if(this.pointers.size>=2){this.samples=[];this.pointer=null;this.clearPreview();this.multi=this.measure();return;}
    this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:0};const p=this.screenSpace?{x:e.clientX,z:e.clientY}:this.point(e);this.samples=p?[[p.x,p.z]]:[];this.preview(this.samples);
  }
  measure(){const [a,b]=[...this.pointers.values()];return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
  move(e){
    if(!this.enabled||!this.pointers.has(e.pointerId))return;
    this.consume(e);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.multi){if(this.pointers.size>=2){const next=this.measure();this.gesture(this.multi,next);this.multi=next;}return;}
    const p=this.pointer;if(!p||p.id!==e.pointerId)return;
    p.moved=Math.max(p.moved,Math.hypot(e.clientX-p.x,e.clientY-p.y));
    const events=e.getCoalescedEvents?.()??[e];for(const sample of events.length?events:[e]){const q=this.screenSpace?{x:sample.clientX,z:sample.clientY}:this.point(sample),last=this.samples.at(-1);if(q&&(!last||Math.hypot(q.x-last[0],q.z-last[1])>(this.screenSpace?1:.07))&&this.samples.length<3000)this.samples.push([q.x,q.z]);}
    const lastInput=events.at(-1)??e;p.lastX=lastInput.clientX;p.lastY=lastInput.clientY;
    this.updatePreview();
  }
  up(e,cancelled=false){
    if(!this.pointers.has(e.pointerId))return;
    // Release can carry a final position absent from pointermove. Keep it in
    // the visual stroke before resolving terrain, without duplicating samples.
    if(!cancelled&&!this.multi&&this.pointer?.id===e.pointerId){
      const p=this.pointer;p.moved=Math.max(p.moved,Math.hypot(e.clientX-p.x,e.clientY-p.y));
      if(e.clientX!==p.lastX||e.clientY!==p.lastY){
        const q=this.screenSpace?{x:e.clientX,z:e.clientY}:this.point(e),last=this.samples.at(-1);
        if(q&&(!last||Math.hypot(q.x-last[0],q.z-last[1])>(this.screenSpace?1:.07))&&this.samples.length<3000)this.samples.push([q.x,q.z]);
      }
    }
    this.consume(e);this.pointers.delete(e.pointerId);try{this.canvas.releasePointerCapture(e.pointerId);}catch{}
    if(cancelled){this.cancel();return;}
    if(this.multi){if(!this.pointers.size)this.cancel();return;}
    const p=this.pointer,samples=this.samples.map(q=>q.slice());this.pointer=null;this.samples=[];this.clearPreview();
    if(!p)return;if(p.moved<8||samples.length<2)this.tap(e);else {
      // Resolve terrain only after release. A missed ray ends the contiguous
      // stroke, so an off-terrain interval cannot become an unintended bridge.
      const resolved=[];
      for(const sample of samples){
        const q=this.screenSpace?this.point({clientX:sample[0],clientY:sample[1]}):{x:sample[0],z:sample[1]};
        if(!q)break;
        const last=resolved.at(-1);if(!last||Math.hypot(q.x-last[0],q.z-last[1])>.07)resolved.push([q.x,q.z]);
      }
      this.stroke(resolved.length>=2?resolved:[]);
    }
  }
  cancel(){for(const id of this.pointers.keys())try{this.canvas.releasePointerCapture(id);}catch{}this.pointers.clear();this.samples=[];this.pointer=null;this.multi=null;this.clearPreview();}
  dispose(){this.cancel();for(const [name,handler] of Object.entries(this.handlers))this.canvas.removeEventListener(name,handler,{capture:true});}
}

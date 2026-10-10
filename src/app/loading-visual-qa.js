// Read-only, opt-in framebuffer evidence. Call after the existing diorama draw;
// this owner never renders, schedules frames, plants crops or changes progress.
// PNG readback/encoding is diagnostic overhead, so captured runs are not timing
// benchmarks. Evidence is bounded and stays local until the harness exports it.
export class LoadingVisualQa {
 constructor({enabled=false,now=()=>performance.now(),capture=canvas=>canvas.toDataURL('image/png'),maxBytes=20000000,catchupProgress=null}={}){
  if(!Number.isSafeInteger(maxBytes)||maxBytes<=0)throw Error('Invalid visual evidence limit');
  if(catchupProgress!==null&&(!Number.isFinite(catchupProgress)||catchupProgress<0||catchupProgress>=1))throw Error('Invalid catch-up evidence selector');this.catchupProgress=catchupProgress;
  this.enabled=enabled;this.now=now;this.capture=capture;this.maxBytes=maxBytes;this.owner=null;this.labels=new Set();this.bytes=0;
  this.report={frames:[],errors:[],closed:false,scope:'Existing diorama canvas read after draw; no physical input, GPU timing or full-world acceptance.'};
 }
 afterDraw(diorama,progress){
  if(!this.enabled||this.report.closed||!diorama?.prepared||diorama.disposed||diorama.world?.disposed)return;
  if(!Number.isFinite(progress)||progress<0||progress>1)return;
  if(this.owner&&this.owner!==diorama)return;this.owner=diorama;
  const plants=diorama.plants?.plants,canvas=diorama.world?.canvas;
  if(!Array.isArray(plants)||!canvas?.width||!canvas.height)return;
  const fifth=plants[4],age=fifth?diorama.plants.time-fifth.born:null;
  const label=this.catchupProgress!==null?(!this.labels.has('initial')?'initial':plants.length===4&&progress>=this.catchupProgress&&progress<1&&!this.labels.has('preplant')?'preplant':plants.length>4&&!this.labels.has('additional-plant')?'additional-plant':age>=.25&&age<diorama.plants.catchupSeconds&&!this.labels.has('catchup-mid')?'catchup-mid':diorama.plants.mature&&!this.labels.has('mature')?'mature':progress>=.9&&progress<1&&!this.labels.has('late')?'late':null):!this.labels.has('initial')?'initial':plants.length>4&&!this.labels.has('additional-plant')?'additional-plant':
   diorama.plants.mature&&!this.labels.has('mature')?'mature':
   progress>=.9&&progress<1&&!this.labels.has('late')?'late':progress>=.5&&progress<.9&&!this.labels.has('middle')?'middle':null;
  if(!label||this.report.frames.length>=6)return;
  // Mark even a failed readback once, preventing an exception/encoding storm.
  this.labels.add(label);
  try{
   const png=this.capture(canvas);
   if(typeof png!=='string'||!png.startsWith('data:image/png;base64,'))throw Error('Canvas did not return a PNG');
   // Account for UTF-16 string storage conservatively, not compressed PNG size.
   const bytes=png.length*2;if(this.bytes+bytes>this.maxBytes)throw Error('Visual evidence limit reached');
   const frame={label,at:this.now(),progress,night:diorama.night??null,width:canvas.width,height:canvas.height,
    plants:plants.map(({id,x,z,growth})=>({id,x,z,growth})),eye:diorama.camera?.position.toArray()??null,
    quaternion:diorama.camera?.quaternion.toArray()??null,png};
   if(this.catchupProgress!==null){frame.presentationTime=diorama.plants.time;frame.animationProgress=diorama.plants.progress;frame.fifthAge=age;frame.plants=plants.map(({id,x,z,growth,born})=>({id,x,z,growth,born}));}
   this.bytes+=bytes;this.report.frames.push(frame);
  }catch(error){this.report.errors.push({label,message:String(error)});}
 }
 close({cancelled=false}={}){if(this.report.closed)return this.report;this.report.closed=true;this.report.cancelled=cancelled;this.report.estimatedStringBytes=this.bytes;this.owner=null;return this.report;}
}

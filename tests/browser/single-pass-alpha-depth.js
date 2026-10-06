// QA opt-in only; the default renderer retains its alpha safeguard.
export class SinglePassAlphaDepth {
 constructor(pass){
  this.pass=pass;this.enabled=false;this.applications=0;
  this.previous=pass.stockAlphaDepth;this.owned=Object.hasOwn(pass,'stockAlphaDepth');
  const owner=this;this.original=pass.captureDepth;
  this.capture=function(...args){
   const result=owner.original.apply(this,args);
   if(owner.enabled)owner.applications+=this.depthCaptureStats?.stockAlphaSpecialized??0;
   return result;
  };
  pass.captureDepth=this.capture;
 }
 setEnabled(enabled){this.enabled=Boolean(enabled);this.pass.stockAlphaDepth=this.enabled;}
 dispose(){
  if(this.pass.captureDepth===this.capture)this.pass.captureDepth=this.original;
  if(this.owned)this.pass.stockAlphaDepth=this.previous;else delete this.pass.stockAlphaDepth;
  this.enabled=false;
 }
}

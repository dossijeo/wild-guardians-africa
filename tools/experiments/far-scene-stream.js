import {loadFarSceneData} from './far-scene-loader.js';
// Fixed-size regional loads, one active worker, last complete result retained.
export class FarSceneStream{
 constructor({load=loadFarSceneData}={}){this.load=load;this.current=null;this.pending=null;this.epoch=0;this.closed=false;this.error=null;}
 request(key,request){
  if(this.closed)return Promise.resolve(null);
  if(this.pending?.key===key)return this.pending.promise;
  if(this.current?.key===key){this.pending?.controller.abort();this.epoch++;this.pending=null;return Promise.resolve(this.current.value);}
  this.pending?.controller.abort();
  const epoch=++this.epoch,controller=new AbortController(),pending={key,controller,promise:null};this.pending=pending;this.error=null;
  pending.promise=Promise.resolve().then(()=>{
   if(this.closed||epoch!==this.epoch)return null;
   return this.load(request,{signal:controller.signal});
  }).then(value=>{
   if(this.closed||epoch!==this.epoch)return null;
   this.pending=null;if(value)this.current={key,value};return value;
  },error=>{
   if(this.closed||epoch!==this.epoch)return null;
   this.pending=null;this.error=error;throw error;
  });
  return pending.promise;
 }
 dispose(){if(this.closed)return;this.closed=true;this.epoch++;this.pending?.controller.abort();this.pending=null;this.current=null;}
}

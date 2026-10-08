// QA-only texture storage command/lifetime inventory; NOT physical VRAM bytes.
// Tracks bindings without GL queries. Installation after renderer construction
// excludes earlier textures/bindings until their next observed bind.
export class TextureRequests {
 constructor(gl){this.gl=gl;this.hooks=[];this.objects=new WeakMap();this.live=new Map();this.bindings=new Map();this.serial=0;this.unit=null;this.unattributed=0;
  this.wrap('createTexture',(_,object)=>{if(object){const record={id:++this.serial,storage:[]};this.objects.set(object,record);this.live.set(record.id,record);}});
  this.wrap('activeTexture',([unit])=>{this.unit=unit;});
  this.wrap('bindTexture',([target,object])=>{this.bindings.set(`${this.unit}:${target}`,object);});
  this.wrap('deleteTexture',([object])=>{const record=this.objects.get(object);if(record)this.live.delete(record.id);});
  this.wrap('texStorage2D',([target,levels,internalFormat,width,height])=>this.storage(target,{method:'texStorage2D',levels,internalFormat,width,height}));
  this.wrap('texStorage3D',([target,levels,internalFormat,width,height,depth])=>this.storage(target,{method:'texStorage3D',levels,internalFormat,width,height,depth}));
  this.wrap('texImage2D',args=>{const [target,level,internalFormat]=args;const source=args.length===6?args[5]:null;this.storage(target,{method:'texImage2D',level,internalFormat,width:source?.width??args[3],height:source?.height??args[4]});});
 }
 wrap(name,observe){const gl=this.gl,original=gl[name],owned=Object.hasOwn(gl,name);if(typeof original!=='function')return;const wrapped=function(...args){const result=original.apply(this,args);observe(args,result);return result;};gl[name]=wrapped;this.hooks.push({name,original,owned,wrapped});}
 storage(target,command){const gl=this.gl,bindingTarget=target>=gl.TEXTURE_CUBE_MAP_POSITIVE_X&&target<=gl.TEXTURE_CUBE_MAP_NEGATIVE_Z?gl.TEXTURE_CUBE_MAP:target;const object=this.bindings.get(`${this.unit}:${bindingTarget}`),record=object&&this.objects.get(object);if(!record){this.unattributed++;return;}record.storage.push({...command,target});}
 id(object){return this.objects.get(object)?.id??null;}
 snapshot(){return {scope:'Observed texture storage API commands and explicit texture deletion after probe installation. Dimensions/internal formats are not physical VRAM bytes; errors/context-loss/driver compression are not polled. Repeated calls may replace storage. No binding queries.',unattributed:this.unattributed,liveTextures:this.live.size,textures:[...this.live.values()].map(record=>({id:record.id,storage:record.storage.slice()}))};}
 dispose(){for(const {name,original,owned,wrapped} of this.hooks)if(this.gl[name]===wrapped){if(owned)this.gl[name]=original;else delete this.gl[name];}this.hooks=[];this.live.clear();this.bindings.clear();}
}

// QA only: tracks ownership without querying GPU state or changing resources.
export function installTextureCensus(){
 const proto=WebGL2RenderingContext.prototype,contexts=new WeakMap(),all=[];
 const state=gl=>{let s=contexts.get(gl);if(!s){s={id:all.length,textures:new Map(),bindings:new Map(),unit:0};contexts.set(gl,s);all.push(s);}return s;};
 const wrap=(name,fn)=>{const original=proto[name];proto[name]=function(...args){return fn.call(this,original,args);};};
 wrap('createTexture',function(original,args){const texture=original.apply(this,args),s=state(this);if(texture)s.textures.set(texture,{id:s.textures.size,stack:new Error().stack,uploads:[]});return texture;});
 wrap('deleteTexture',function(original,args){state(this).textures.delete(args[0]);return original.apply(this,args);});
 wrap('activeTexture',function(original,args){state(this).unit=args[0];return original.apply(this,args);});
 wrap('bindTexture',function(original,args){const s=state(this);s.bindings.set(s.unit+':'+args[0],args[1]);return original.apply(this,args);});
 for(const name of ['texStorage2D','texImage2D','texSubImage2D'])wrap(name,function(original,args){const s=state(this),row=s.textures.get(s.bindings.get(s.unit+':'+args[0]));if(row&&row.uploads.length<4){const image=args.at(-1);row.uploads.push({name,args:args.map(x=>typeof x==='number'?x:null),image:image&&typeof image==='object'?{width:image.width,height:image.height,src:image.currentSrc??image.src??null}:null});}return original.apply(this,args);});
 globalThis.qaTextureCensus=()=>all.map(s=>({context:s.id,textures:[...s.textures.values()]}));
}

// QA-only GL lifetime observation. Never load during timings.
(() => {
 const contexts=new WeakMap(),original=HTMLCanvasElement.prototype.getContext;
 globalThis.qaTextureContexts=contexts;
 HTMLCanvasElement.prototype.getContext=function(...args){
  const gl=original.apply(this,args);if(!gl||!String(args[0]).startsWith('webgl')||contexts.has(gl))return gl;
  const active=new Map(),all=[],bound=new Map();let unit=0,next=0;contexts.set(gl,{active,all});
  for(const method of ['createTexture','deleteTexture','activeTexture','bindTexture','texImage2D','texStorage2D']){
   const fn=gl[method];gl[method]=function(...a){
    if(method==='activeTexture')unit=a[0];
    if(method==='bindTexture')bound.set(unit+':'+a[0],a[1]);
    if(method==='deleteTexture'){const e=active.get(a[0]);if(e){e.deleted=true;active.delete(a[0]);}}
    if(method==='texImage2D'||method==='texStorage2D'){
     const target=a[0]>=gl.TEXTURE_CUBE_MAP_POSITIVE_X&&a[0]<=gl.TEXTURE_CUBE_MAP_NEGATIVE_Z?gl.TEXTURE_CUBE_MAP:a[0],e=active.get(bound.get(unit+':'+target));
     if(e){const im=a[a.length-1];e.uploads++;e.width=method==='texStorage2D'?a[3]:typeof a[3]==='number'&&a.length>=9?a[3]:im?.width;e.height=method==='texStorage2D'?a[4]:typeof a[4]==='number'&&a.length>=9?a[4]:im?.height;e.source=im?.currentSrc||im?.src||im?.constructor?.name||typeof im;}
    }
    const result=fn.apply(this,a);if(method==='createTexture'){const e={id:next++,uploads:0,deleted:false};active.set(result,e);all.push(e);}return result;
   };
  }return gl;
 };
 globalThis.qaTextureSnapshot=w=>{
  const audit=contexts.get(w.renderer.getContext()),seen=new WeakSet(),textures=new Map();let visits=0;
  function walk(v,path,depth){if(!v||typeof v!=='object'||seen.has(v)||depth>10||ArrayBuffer.isView(v)||v instanceof ArrayBuffer||++visits>150000)return;seen.add(v);
   if(v.isTexture){const handle=w.renderer.properties.get(v).__webglTexture,e=audit.active.get(handle);textures.set(v.uuid,{id:e?.id,name:v.name,path,width:v.image?.width,height:v.image?.height,src:v.image?.currentSrc||v.image?.src||null,uploaded:!!handle});return;}
   if(v instanceof Map){for(const [k,x]of v)walk(x,path+'.map',depth+1);return;}
   if(v instanceof Set){for(const x of v)walk(x,path+'.set',depth+1);return;}
   if(v instanceof HTMLElement||v instanceof WebGL2RenderingContext)return;
   for(const k of Object.keys(v)){if(['parent','renderer','domElement','state','nav','field','geometry','attributes','index','matrixWorld','matrix','quaternion'].includes(k))continue;try{walk(v[k],path+'.'+k,depth+1);}catch{}}
  }walk(w,'world',0);
  return {memory:{...w.renderer.info.memory},active:[...audit.active.values()],all:audit.all,textures:[...textures.values()],visits};
 };
})();

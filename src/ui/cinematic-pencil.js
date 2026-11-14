export class PencilBackground {
  constructor(onStatus=()=>{}) {
    this.onStatus=onStatus;this.ready=false;this.available=false;
    this.canvas=document.createElement('canvas');this.canvas.className='campaign-cinema__pencil';
    this.canvas.setAttribute('aria-hidden','true');this.canvas.style.display='none';
    this.lastProgress=-1;this.lastEnabled=null;this.dirty=true;
    this.canvas.addEventListener('webglcontextlost',e=>{
      e.preventDefault();this.available=false;this.canvas.style.display='none';
      this.onStatus('Se ha perdido WebGL. Se muestra el fondo original.');
    });
    this.canvas.addEventListener('webglcontextrestored',()=>{
      try{this.init();if(this.image&&this.guide){this.upload();this.dirty=true;this.draw(this.progress,this.enabled)}}
      catch(e){this.fail(e)}
    });
    try{this.init()}catch(e){this.fail(e)}
    if(typeof ResizeObserver!=='undefined'){
      this.observer=new ResizeObserver(()=>{this.dirty=true;if(this.ready)this.draw(this.progress,this.enabled)});
    }else{this.onResize=()=>{this.dirty=true;if(this.ready)this.draw(this.progress,this.enabled)};window.addEventListener('resize',this.onResize);}
  }
  fail(error){
    console.warn('Pencil background:',error.message||error);
    this.available=false;this.canvas.style.display='none';
    this.onStatus('WebGL no disponible: se conserva la ilustración original.');
  }
  init(){
    const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true})
      ||this.canvas.getContext('experimental-webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true});
    if(!gl)throw new Error('WebGL unavailable');
    this.gl=gl;
    const vertex=`attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=vec2(a_position.x*.5+.5,.5-a_position.y*.5);gl_Position=vec4(a_position,0.,1.);}`;
    const fragment=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_image;
uniform sampler2D u_guide;
uniform float u_progress;
uniform float u_seed;
uniform vec2 u_size;
varying vec2 v_uv;
float hash(vec2 p){p=fract(mod(p,64.)*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
// Every short stroke has its own start time, direction and moving tip.
// Nothing flickers: all grain and stroke jitter are fixed in image coordinates.
float stroke(vec2 px,vec2 axis,float spacing,float base,float seed){
  vec2 normal=vec2(-axis.y,axis.x);
  vec2 q=vec2(dot(px,axis),dot(px,normal));
  float row=floor(q.y/spacing);
  float r=hash(vec2(row,seed));
  float len=mix(58.,134.,r);
  float offset=hash(vec2(row+11.,seed+5.))*len;
  float cell=floor((q.x+offset)/len);
  float along=fract((q.x+offset)/len);
  vec2 id=vec2(cell,row)+seed;
  float random=hash(id);
  vec2 center=axis*((cell+.5)*len-offset)+normal*((row+.5)*spacing);
  float order=texture2D(u_guide,clamp(center/u_size,vec2(.001),vec2(.999))).b;
  float begin=base+.50*order+.075*random;
  float duration=mix(.022,.047,hash(id+7.));
  float tip=clamp((u_progress-begin)/duration,0.,1.);
  float travel=mix(along,1.-along,step(.5,r));
  float written=(1.-smoothstep(tip-.014,tip+.008,travel))*step(.0001,tip);
  float wobble=.38*sin(q.x*.075+r*6.28)+.20*sin(q.x*.19+random*8.);
  float across=abs(mod(q.y,spacing)-spacing*.5+wobble);
  float width=mix(.55,1.0,random);
  float line=1.-smoothstep(width,width+.75,across);
  float ends=smoothstep(0.,.025,along)*(1.-smoothstep(.965,1.,along));
  return line*written*ends;
}
void main(){
  vec3 original=texture2D(u_image,v_uv).rgb;
  if(u_progress>=1.){gl_FragColor=vec4(original,1.);return;}
  vec3 guide=texture2D(u_guide,v_uv).rgb;
  vec2 px=v_uv*u_size;
  float grain=noise(px*.72);
  float paperCloud=noise(px*.009);
  vec3 paper=vec3(.91,.85,.73)+(grain-.5)*.032+(paperCloud-.5)*.022;
  if(u_progress<=0.){gl_FragColor=vec4(paper,1.);return;}
  float lum=dot(original,vec3(.299,.587,.114));
  // Real image contours are revealed along their paths, not by global opacity.
  float pathTime=.018+.405*guide.g;
  float outline=guide.r*smoothstep(pathTime-.005,pathTime+.009,u_progress);
  float pencilGrain=.72+.28*grain;
  vec3 graphite=mix(vec3(.24,.19,.135),original,.12);
  vec3 sketch=mix(paper,graphite,outline*.88*pencilGrain);
  float h1=stroke(px,vec2(.88295,-.46947),5.2,.13,u_seed+1.);
  float h2=stroke(px,vec2(.81915,.57358),4.6,.25,u_seed+19.);
  float h3=stroke(px,vec2(.95630,-.29237),3.0,.37,u_seed+43.);
  float h4=stroke(px,vec2(.74314,.66913),2.7,.46,u_seed+71.);
  float density=1.-(1.-h1*.79)*(1.-h2*.80)*(1.-h3*.92)*(1.-h4*.92);
  // Grain and graphite remain visible between the coloured-pencil strokes.
  vec3 colouredPencil=mix(paper,original,.91);
  vec3 result=mix(sketch,colouredPencil,density*(.88+.12*grain));
  // Filled areas settle locally behind the strokes. The last pass removes all
  // stylisation, and exactly at 50% of slide time the native image takes over.
  float localOrder=clamp(guide.b+(noise(px*.095)-.5)*.07,0.,1.);
  float settle=smoothstep(.53+.28*localOrder,.70+.28*localOrder,u_progress);
  result=mix(result,original,settle);
  result=mix(result,original,smoothstep(.94,1.,u_progress));
  gl_FragColor=vec4(result,1.);
}`;
    const compile=(type,source)=>{
      const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const text=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(text)}
      return s;
    };
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    this.program=program;gl.useProgram(program);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    this.uniforms={progress:gl.getUniformLocation(program,'u_progress'),seed:gl.getUniformLocation(program,'u_seed'),size:gl.getUniformLocation(program,'u_size')};
    this.textures=[gl.createTexture(),gl.createTexture()];
    for(let i=0;i<2;i++){
      gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    }
    gl.uniform1i(gl.getUniformLocation(program,'u_image'),0);gl.uniform1i(gl.getUniformLocation(program,'u_guide'),1);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.DITHER);
    this.available=true;this.dirty=true;
  }
  upload(){
    const gl=this.gl;gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    [this.image,this.guide].forEach((image,i)=>{
      gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);
      // Guides are data, not colours: never colour-correct their encoded times.
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,i===1?gl.NONE:gl.BROWSER_DEFAULT_WEBGL);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    });
  }
  attach(host,image,guide,seed){
    if(!this.available||!guide)return;
    // Keep a snapshot in the outgoing stack, and reuse this single GL context.
    if(this.host&&this.canvas.parentNode===this.host&&this.canvas.style.display!=='none'){
      const still=document.createElement('canvas');still.className='campaign-cinema__pencil';
      still.width=this.canvas.width;still.height=this.canvas.height;
      still.getContext('2d').drawImage(this.canvas,0,0);this.host.appendChild(still);
    }
    if(this.host)this.observer?.unobserve(this.host);
    this.host=host;this.stage=host;this.image=image;this.guide=guide;this.seed=seed;
    host.appendChild(this.canvas);
    this.observer?.observe(host);
    try{this.upload();this.ready=true;this.dirty=true;this.lastProgress=-1}
    catch(e){this.fail(e)}
  }
  draw(progress,enabled){
    this.progress=Math.max(0,Math.min(1,progress||0));this.enabled=!!enabled;
    if(!this.ready||!this.available)return;
    const visible=this.enabled&&this.progress<1;
    this.canvas.style.display=visible?'block':'none';
    // No draw calls in the second half or while the unchanged frame is paused.
    if(!visible)return;
    if(!this.dirty&&this.lastProgress===this.progress&&this.lastEnabled===this.enabled)return;
    const gl=this.gl,ratio=Math.min(window.devicePixelRatio||1,1.5);
    const w=Math.max(2,Math.min(1672,Math.round(this.stage.clientWidth*ratio)));
    const h=Math.max(2,Math.round(w*this.stage.clientHeight/Math.max(1,this.stage.clientWidth)));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h)}
    gl.useProgram(this.program);gl.uniform1f(this.uniforms.progress,this.progress);gl.uniform1f(this.uniforms.seed,this.seed);
    // Constant image-space pencil size: resizing does not change the drawing.
    gl.uniform2f(this.uniforms.size,1280,1280*this.image.naturalHeight/this.image.naturalWidth);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    this.lastProgress=this.progress;this.lastEnabled=this.enabled;this.dirty=false;
  }
  dispose(){
    this.observer?.disconnect();if(this.onResize)window.removeEventListener('resize',this.onResize);
    const gl=this.gl;if(gl&&!gl.isContextLost()){for(const texture of this.textures??[])gl.deleteTexture(texture);if(this.buffer)gl.deleteBuffer(this.buffer);if(this.program)gl.deleteProgram(this.program);}
    this.canvas.remove();this.ready=false;this.available=false;this.host=null;
  }
}

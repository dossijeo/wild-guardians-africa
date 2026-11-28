import * as THREE from 'three';

// Additive ribbons need no back/front ordering pass: retain both faces in one draw.
// Two persistent draw calls. Time drives every vertex on the GPU; no particles
// are allocated, sorted or uploaded while a summon is running.
export class GuardianVortex extends THREE.Group{
 constructor(){
  super();this.visible=false;
  this.uniforms={age:{value:0},flow:{value:0},tint:{value:new THREE.Color()},height:{value:3},floor:{value:0}};
  const positions=[],uv=[];
  for(let strand=0;strand<3;strand++)for(let step=0;step<48;step++){
   for(const [offset,side] of [[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]]){
    positions.push(strand,(step+offset)/48,side);uv.push((side+1)/2,(step+offset)/48);
   }
  }
  this.ribbonGeometry=new THREE.BufferGeometry();this.ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.ribbonGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const common=`uniform float age,flow,height,floor; uniform vec3 tint; varying float strength;`;
  this.ribbonMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,blending:THREE.AdditiveBlending,toneMapped:false,
   vertexShader:common+`varying vec2 vUv;
    void main(){float h=position.y; float opening=smoothstep(0.,.35,age);float ending=smoothstep(1.45,2.2,age);
     float radius=(1.05+.3*sin(h*3.14159))*(1.-.32*opening)+ending*.5;
     float theta=position.x*2.094395+h*8.5-flow*5.; float width=position.z*.045*sin(h*3.14159);
     vec3 p=vec3(cos(theta)*(radius+width),floor+h*height,sin(theta)*(radius+width));
     strength=smoothstep(0.,.12,age)*(1.-smoothstep(1.8,2.2,age))*(1.-.7*smoothstep(.5,.95,age));
     vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`,fragmentShader:common+`varying vec2 vUv; void main(){float edge=pow(max(0.,1.-abs(vUv.x*2.-1.)),.7);gl_FragColor=vec4(tint*1.5,strength*edge*sin(vUv.y*3.14159));}`});
  this.ribbons=new THREE.Mesh(this.ribbonGeometry,this.ribbonMaterial);this.ribbons.frustumCulled=false;this.add(this.ribbons);
  const seeds=[];for(let i=0;i<96;i++)seeds.push(i/96,((i*37)%97)/97,((i*53)%101)/101);
  this.moteGeometry=new THREE.BufferGeometry();this.moteGeometry.setAttribute('position',new THREE.Float32BufferAttribute(seeds,3));
  this.moteMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
   vertexShader:common+`void main(){float ending=smoothstep(1.4,2.2,age);float h=fract(position.x+flow*(.45+position.z*.2));
    float radius=mix(1.8,.4,smoothstep(0.,.55,age))*(.4+position.y*.6)+ending*position.z;
    float theta=position.y*6.283185+flow*4.+h*5.;vec3 p=vec3(cos(theta)*radius,floor+h*height+ending*.6,sin(theta)*radius);
    vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp((12.+position.z*10.)/max(1.,-view.z)*8.,1.,14.);
    strength=smoothstep(0.,.1,age)*(1.-smoothstep(1.8,2.2,age))*sin(h*3.14159);}`,fragmentShader:common+`void main(){float d=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-d),2.);gl_FragColor=vec4(tint*1.6,a*strength);}`});
  this.motes=new THREE.Points(this.moteGeometry,this.moteMaterial);this.motes.frustumCulled=false;this.add(this.motes);
 }
 update(age,color,height=3,floor=-1.2,continuous=false){this.visible=continuous||age>=0&&age<2.2;this.uniforms.flow.value=age;this.uniforms.age.value=continuous?.7:age;this.uniforms.tint.value.setHex(color);this.uniforms.height.value=height;this.uniforms.floor.value=floor;}
 dispose(){this.ribbonGeometry.dispose();this.ribbonMaterial.dispose();this.moteGeometry.dispose();this.moteMaterial.dispose();}
}

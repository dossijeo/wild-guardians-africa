import * as T from 'three';
const materials=new Map();
function mat(color,opacity=1){const key=color+opacity;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.86,metalness:0,flatShading:true,transparent:opacity<1,opacity,depthWrite:opacity>=1}));return materials.get(key);}
function mesh(g,geometry,color,p=[0,0,0],scale=[1,1,1],opacity=1){const m=new T.Mesh(geometry,mat(color,opacity));m.position.set(...p);m.scale.set(...scale);m.castShadow=m.receiveShadow=opacity>=1;g.add(m);return m;}
const ball=(g,color,p,s=[1,1,1],detail=0,opacity=1)=>mesh(g,new T.IcosahedronGeometry(1,detail),color,p,s,opacity);
function rod(g,a,b,r,color,sides=5){const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from),m=mesh(g,new T.CylinderGeometry(r,r,delta.length(),sides),color,from.clone().add(to).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
function cone(g,p,r,h,color,rotation=[0,0,0]){const m=mesh(g,new T.ConeGeometry(r,h,5),color,p);m.rotation.set(...rotation);return m;}
function plate(g,points,color,depth=.08){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(g,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),color);}
function leaf(g,color,p=[0,0,0],scale=1,angle=0){const vertices=[0,.7,0,-.36,.02,0,0,-.6,0,.36,.02,0,0,.02,.16],indices=[0,1,4,1,2,4,2,3,4,3,0,4,0,3,2,0,2,1],geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const m=mesh(g,geo,color,p,[scale,scale,scale]);m.rotation.z=angle;rod(g,[p[0],p[1]-.55*scale,p[2]+.1],[p[0],p[1]+.53*scale,p[2]+.1],.018*scale,'#c9bd8a');return m;}
// Folded blade with an asymmetric edge, used by foliage rather than insect wings.
function foliage(g,color,p=[0,0,0],scale=1,angle=0){
 const root=new T.Group();root.position.set(...p);root.scale.setScalar(scale);root.rotation.z=angle;g.add(root);
 const edge=[[0,.73],[-.21,.43],[-.36,.1],[-.28,-.14],[-.08,-.53],[.18,-.33],[.34,-.04],[.27,.28]],vertices=[],indices=[];
 for(const [x,y] of edge)vertices.push(x,y,0);vertices.push(0,.02,.14);
 for(let i=0;i<edge.length;i++)indices.push(i,(i+1)%edge.length,8);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const blade=mesh(root,geometry,color);blade.material=mat(color);blade.material.side=T.DoubleSide;
 rod(root,[0,-.67,.02],[0,.62,.12],.022,'#d8c68b');
 for(const y of [-.25,.02,.28])for(const side of [-1,1])rod(root,[0,y,.14],[side*.23,y+.13,.035],.009,'#bfae73');
 return root;
}
function waterDrop(g,color){
 const points=[new T.Vector2(0,-.56),new T.Vector2(.29,-.5),new T.Vector2(.43,-.26),new T.Vector2(.4,.02),new T.Vector2(.24,.31),new T.Vector2(.09,.55),new T.Vector2(0,.72)];
 const m=mesh(g,new T.LatheGeometry(points,12),color);m.material=new T.MeshStandardMaterial({color,roughness:.25,metalness:.05,flatShading:true});
 ball(g,'#f0f9e7',[-.1,.02,.36],[.075,.2,.04],1);
 ball(g,'#c5eef0',[.22,-.3,.29],[.08,.06,.035],0);
}
function cloud(g,color,opacity=1){
 // Unequal overlapping lobes form a continuous crown and a scalloped underside.
 for(const [x,y,z,r] of [[-.44,-.08,0,.31],[-.1,.13,-.02,.45],[.34,.02,.01,.36],[-.4,-.26,.14,.24],[-.1,-.25,.16,.32],[.24,-.23,.16,.3],[.48,-.2,.07,.2]])ball(g,color,[x,y,z],[r,r*.86,r*.75],2,opacity);
}
function bug(g,type,frame=0){const gold=type==='beetle',ant=type==='ants',termite=type==='termite',fly=type==='fly',locust=type==='locust',body=gold?'#d5ab4e':ant?'#79432a':termite?'#b18d61':'#8ca468';
 ball(g,body,[0,-.16,0],[gold?.43:.25,gold?.5:.42,.25],1);ball(g,body,[0,.26,.05],[.23,.22,.2],1);if(ant||termite)ball(g,body,[0,.04,.02],[.17,.19,.16],0);
 for(const side of [-1,1]){for(let i=0;i<3;i++)rod(g,[side*.14,.13-i*.2,0],[side*(.43+i*.035),.25-i*.27,.08],.038,'#3f4831');rod(g,[side*.11,.42,.03],[side*.26,.61,.02],.027,'#3f4831');ball(g,'#344c3c',[side*.1,.33,.22],[.035,.045,.035],0);}
 if(gold){rod(g,[0,-.52,.23],[0,.12,.23],.015,'#a47e36');ball(g,'#f0ce74',[-.16,-.1,.19],[.13,.25,.12],0);}
 if(fly||locust||type==='firefly'){const flap=locust?[.48,.15,-.15][frame]:.35;for(const side of [-1,1]){const wing=leaf(g,'#c9dcca',[side*.3,flap,.02],.55,side*1.1);wing.material=mat('#d6e7d8',.76);}if(type==='firefly')ball(g,'#ebdf89',[0,-.4,.18],[.2,.2,.19],1);}
}
function drop(g,color){const points=[new T.Vector2(0,-.62),new T.Vector2(.34,-.46),new T.Vector2(.43,-.12),new T.Vector2(.34,.2),new T.Vector2(.14,.53),new T.Vector2(0,.82)];mesh(g,new T.LatheGeometry(points,9),color);ball(g,'#eef5e1',[-.12,.03,.33],[.065,.14,.035],0);}
function twig(g,big=false){
 const r=big?.11:.07;
 rod(g,[-.52,-.58,0],[-.08,-.06,0],r,'#735437');rod(g,[-.08,-.06,0],[.22,.32,.03],r*.8,'#8c6840');rod(g,[.22,.32,.03],[.48,.67,.04],r*.48,'#ad8757');
 rod(g,[-.09,-.07,0],[-.48,.38,.04],r*.6,'#8c6840');rod(g,[-.48,.38,.04],[-.39,.61,.04],r*.28,'#b39864');rod(g,[.13,.21,.03],[.57,.17,.04],r*.5,'#9d794a');
 ball(g,'#d7ba84',[-.52,-.58,.035],[r*.8,r*.6,r*.8],0);
 if(big){leaf(g,'#7b8b45',[.47,.32,.06],.3,-.8);leaf(g,'#a6a052',[-.37,.46,.05],.24,.65);}
}
function wind(g,color,heat=false){for(let j=0;j<3;j++){const points=[];for(let i=0;i<12;i++){const t=i/11;points.push(heat?new T.Vector3(j*.35-.35+Math.sin(t*8+j)*.07,t*1.3-.65,0):new T.Vector3(t*1.5-.75,j*.28-.28+Math.sin(t*5)*.1,0));}mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points),15,.025,4,false),color,[0,0,0],[1,1,1],.72);}}
function gem(g,color){const m=mesh(g,new T.OctahedronGeometry(.55),color);m.scale.set(.65,1.25,.65);m.rotation.z=.18;}
export const SPRITE_SLOTS=[['seed',0,1],['firefly',1,1],['bird',2,4],['sparkle',7,1],['butterfly',8,4],['beetle',12,1],['locust',13,3],['termite',16,1],['cloud',17,1],['raindrop',18,1],['flame',19,5],['smoke',24,1],['lightning',25,3],['stormcloud',28,1],['feather',32,1],['dew',33,1],['flower',34,1],['spirit',35,1],['goldenleaves',36,1],['star',37,1],['pollen',38,1],['rainbow',39,1],['rareseed',40,1],['weeds',41,1],['ants',42,1],['mound',43,1],['burrow',44,1],['dustdevil',45,1],['fog',46,1],['pathleaves',47,1],['spores',48,1],['debris',49,1],['web',50,1],['insects',51,1],['grain',52,1],['sack',53,1],['snake',54,1],['snakebody',55,1],['thornseeds',56,1],['hail',57,1],['gust',58,1],['branch',59,1],['fallingdebris',60,1],['heat',61,1],['rainbowAqua',62,1],['rainbowGold',63,1]];
export function createSprite(id,frame=0){const g=new T.Group();
 if(id==='firefly'){
  // A dark thorax frames the lantern; short translucent wings keep it insect-like at 20px.
  ball(g,'#405546',[0,.08,0],[.21,.4,.18],1);
  ball(g,'#778851',[0,.42,.04],[.19,.18,.17],0);
  const lantern=ball(g,'#f2f6a2',[0,-.34,.09],[.24,.29,.21],1);
  lantern.material=new T.MeshStandardMaterial({color:'#edf6a1',emissive:'#c5ed70',emissiveIntensity:.65,roughness:.8,flatShading:true});
  for(const side of [-1,1]){
   const wing=leaf(g,'#aabfa1',[side*.24,.1,-.03],.37,side*.9);wing.material=mat('#c2d4af',.58);
   rod(g,[side*.09,.45,.05],[side*.2,.65,.03],.025,'#66754c');
   for(let i=0;i<2;i++)rod(g,[side*.14,.2-i*.2,.02],[side*.3,.1-i*.23,.02],.025,'#66754c');
  }
 }
 else if(id==='termite'){
  // Pale segmented abdomen and ochre head separate from the warm wooden palisade.
  ball(g,'#e1c49a',[0,-.3,0],[.19,.34,.18],1);
  ball(g,'#69432b',[0,.08,.03],[.13,.17,.13],0);
  ball(g,'#744426',[0,.4,.04],[.24,.24,.2],1);
  for(const side of [-1,1]){
   for(let i=0;i<3;i++)rod(g,[side*.12,.18-i*.18,.02],[side*.43,.29-i*.29,.04],.045,'#423624');
   rod(g,[side*.12,.53,.02],[side*.25,.72,.02],.027,'#59462c');
   ball(g,'#3e3928',[side*.12,.45,.2],[.045,.045,.03],0);
  }
 }
 else if(['beetle','locust','ants','insects'].includes(id))bug(g,id==='insects'?'fly':id,frame);
 else if(id==='bird'){
  ball(g,'#97b3bd',[0,-.12,0],[.32,.5,.28],1);ball(g,'#e5d7ad',[0,-.22,.2],[.22,.32,.16],1);ball(g,'#6d91a4',[0,.4,.04],[.29,.27,.25],1);
  for(const side of [-1,1]){const wing=plate(g,[[side*.18,.13],[side*.85,[.65,.2,-.4,.12][frame]],[side*.65,-.23],[side*.2,-.32]],'#6e93a5');wing.position.z=-.08;ball(g,'#263d42',[side*.15,.46,.24],[.035,.04,.03]);rod(g,[side*.1,-.48,.03],[side*.13,-.62,.1],.025,'#b28b55');}cone(g,[0,.32,.39],.1,.24,'#e4b267',[Math.PI/2,0,0]);
 }
 else if(id==='butterfly'){
  g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(4,3.5,5).normalize());
  const width=[1,.65,.2,.72][frame];
  for(const side of [-1,1]){
   const wing=new T.Group();g.add(wing);wing.scale.x=side*width;
   const outline=new T.Shape();outline.moveTo(.035,.05);outline.bezierCurveTo(.14,.45,.44,.77,.72,.63);outline.bezierCurveTo(.9,.39,.68,.04,.32,-.08);outline.bezierCurveTo(.66,-.15,.57,-.55,.33,-.55);outline.bezierCurveTo(.1,-.51,.06,-.18,.035,.05);
   const geometry=new T.ExtrudeGeometry(outline,{depth:.04,bevelEnabled:false});
   mesh(wing,geometry,'#5b4937');
   mesh(wing,geometry.clone(),'#e2ad68',[.028,.005,.05],[.9,.9,1]);
   rod(wing,[.07,.03,.11],[.56,.47,.11],.017,'#8b603b');
   rod(wing,[.08,-.05,.11],[.37,-.4,.11],.017,'#8b603b');
   ball(wing,'#f5e4bd',[.56,.38,.12],[.065,.09,.02],0);
   rod(g,[side*.04,.41,.1],[side*.17,.67,.1],.025,'#514336');
  }ball(g,'#514336',[0,0,.12],[.075,.45,.08],1);
 }
 else if(id==='cloud'||id==='stormcloud')cloud(g,id==='cloud'?'#d4dfe0':'#73889f');
 else if(id==='fog'){
  for(const [x,y,r] of [[-.52,-.08,.31],[-.14,.03,.48],[.3,-.03,.42],[.57,-.1,.28]])ball(g,'#d4e4db',[x,y,0],[r,r*.38,r*.5],1,.5);
 }
 else if(id==='smoke'){
  for(const [x,y,r] of [[-.14,-.48,.18],[.09,-.19,.3],[-.08,.16,.4],[.14,.49,.43]])ball(g,'#9da49e',[x,y,0],[r,r*.8,r*.65],1,.5);
 }
 else if(id==='dustdevil'){
  // Broken curved banks of dust, with open air through the centre.
  for(let i=0;i<6;i++){
   const a=-.5+i*.8,r=.22+i*.013;
   ball(g,i%2?'#ac8753':'#c4a371',[Math.cos(a)*.53,Math.sin(a)*.39,Math.sin(a)*.1],[r,r*.65,r*.6],1,.78);
  }
 }
 else if(id==='raindrop'||id==='dew')waterDrop(g,id==='dew'?'#70bbb8':'#68a9c5');
 else if(id==='flame'){
  // Three crooked tongues and an inset hot core remain readable in the 64px bake.
  const bend=Math.sin(frame*1.35)*.16;
  const outer=[[-.38,-.61],[-.56,-.24],[-.46,.22],[-.25,-.02],[-.13,.35],[bend,.87],[.22+bend,.44],[.14,.1],[.39,.39],[.38,-.02],[.55,-.26],[.31,-.61]];
  const shape=new T.Shape();outer.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  mesh(g,new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.035,bevelThickness:.035}),'#d96a28');
  const core=plate(g,[[-.23,-.56],[-.31,-.22],[-.17,.08],[-.09,-.13],[.03+bend*.4,.4],[.16,-.08],[.24,.04],[.29,-.3],[.18,-.56]],'#ffce62',.04);core.position.z=.21;
  const hot=plate(g,[[-.1,-.54],[-.13,-.26],[0,.02],[.13,-.28],[.1,-.54]],'#fff1b0',.025);hot.position.z=.27;
  g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(4,3.5,5).normalize());
 }
 else if(id==='lightning'){const m=plate(g,[[.15,.8],[-.4,-.05],[-.03,-.05],[-.18,-.8],[.5,.18],[.1,.18],[.38,.8]],frame===1?'#f9edbc':'#e4cb86',.12);m.rotation.z=(frame-1)*.04;}
 else if(id==='seed'||id==='rareseed'){
  ball(g,id==='seed'?'#b78b58':'#d8b766',[0,-.24,0],[.22,.44,.22],1);
  if(id==='seed'){rod(g,[0,-.1,0],[0,.6,0],.018,'#d6cba8');for(let i=0;i<12;i++){const a=i*Math.PI/6,tip=[Math.cos(a)*.46,.6+Math.sin(a)*.2,Math.sin(a)*.22];rod(g,[0,.35,0],tip,.024,'#f3e6c5');ball(g,'#eee2bf',tip,[.05,.025,.035],0);}}
  else{rod(g,[0,-.1,0],[0,.55,0],.025,'#759956');leaf(g,'#91ad69',[-.23,.4,0],.48,.8);leaf(g,'#a0ba78',[.24,.48,0],.48,-.8);}
 }
 else if(id==='feather'){
  rod(g,[-.16,-.75,.1],[.16,.68,.1],.025,'#ddcba2');
  for(let i=0;i<9;i++){const y=-.45+i*.12,x=y*.22,w=.3*Math.sin((i+1)/10*Math.PI);for(const side of [-1,1]){
   plate(g,[[x,y],[x+side*w,y+.13],[x+side*w*.85,y+.25],[x+.035,y+.14]],i>5?'#5c6c65':side<0?'#dfd7b9':'#a8ae99',.035);
  }}
 }
 else if(id==='flower'){rod(g,[0,-.8,0],[0,.25,0],.035,'#749959');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,'#ce9dbd',[Math.sin(a)*.3,.28+Math.cos(a)*.3,.04],[.21,.24,.1],1);}ball(g,'#e7c97b',[0,.28,.15],[.18,.18,.1],1);leaf(g,'#8ca666',[-.2,-.45,0],.4,.9);}
 else if(id==='spirit'){drop(g,'#b4d7df');for(const x of [-.13,.13])ball(g,'#4c6f81',[x,.02,.37],[.04,.06,.025]);}
 else if(['goldenleaves','pathleaves'].includes(id))foliage(g,id==='goldenleaves'?'#c9943f':'#947144',[0,0,0],1,.25);
 else if(id==='sparkle'||id==='star'){const points=[],n=id==='star'?5:4;for(let i=0;i<n*2;i++){const a=i*Math.PI/n+Math.PI/2,r=i%2?.25:.7;points.push([Math.cos(a)*r,Math.sin(a)*r]);}plate(g,points,'#f1d99d',.12);}
 else if(['rainbow','rainbowAqua','rainbowGold'].includes(id))gem(g,{rainbow:'#ba9ec7',rainbowAqua:'#8fbdc8',rainbowGold:'#dcc583'}[id]);
 else if(id==='pollen'){
  // Matte uneven motes, without the hard highlights of spilled grain or coins.
  for(const [x,y,r] of [[-.29,.22,.18],[.27,.1,.15],[-.07,-.31,.15],[.06,.42,.08],[.34,-.26,.08]])ball(g,'#d6b45d',[x,y,0],[r,r*.9,r*.7],1,.96);
 }
 else if(id==='grain'){
  for(const [x,y,a] of [[-.27,.24,.4],[.24,.01,-.25],[-.04,-.34,1]]){
   const kernel=new T.Group();kernel.position.set(x,y,0);kernel.rotation.z=a;g.add(kernel);
   ball(kernel,'#c28e3c',[0,0,0],[.16,.29,.14],1);
   rod(kernel,[0,-.19,.13],[0,.19,.13],.018,'#74532c');
   ball(kernel,'#f0d18b',[-.055,.06,.115],[.04,.14,.025],0);
  }
 }
 else if(id==='weeds'){
  for(const [x,y,scale,a] of [[-.2,-.08,.72,.78],[.17,-.03,.8,-.65],[0,.19,.85,.08]])foliage(g,x<0?'#547334':'#6f8f43',[x,y,0],scale,a);
  for(const x of [-.12,.1,.23]){rod(g,[x,-.4,.02],[x*.8,-.73,.08],.035,'#ad9269');rod(g,[x*.9,-.58,.06],[x*.9+.13,-.66,.08],.022,'#c9af7f');}
 }
 else if(id==='mound'){ball(g,'#a88b65',[0,-.16,0],[.8,.48,.55],1);ball(g,'#655a43',[0,-.13,.45],[.37,.27,.05],1);}
 else if(id==='burrow'){ball(g,'#a98c6b',[0,-.05,0],[.48,.53,.36],1);ball(g,'#d3bb97',[0,-.18,.3],[.28,.22,.15],1);for(const x of [-.22,.22])ball(g,'#33483f',[x,.13,.32],[.05,.06,.04]);ball(g,'#947367',[0,-.06,.44],[.08,.05,.04]);for(const x of [-.43,.43])ball(g,'#c0a784',[x,-.4,.24],[.17,.11,.14],0);}
 else if(id==='spores'){for(const side of [-1,1]){leaf(g,'#c5bbaf',[side*.28,.2,0],.5,side*.9);rod(g,[side*.08,.12,0],[side*.18,-.45,0],.02,'#b7a78e');ball(g,'#d7caad',[side*.18,-.48,0],[.09,.14,.09]);}}
 else if(id==='debris'||id==='branch')twig(g,id==='branch');
 else if(id==='web'){
  const silk=(a,b)=>{rod(g,a,b,.027,'#596c58',5);rod(g,[a[0],a[1],.035],[b[0],b[1],.035],.016,'#f0ebd5',5);};
  for(let j=0;j<8;j++){const a=j*Math.PI/4;silk([0,0,0],[Math.cos(a)*.75,Math.sin(a)*.75,0]);}
  for(const r of [.24,.46,.66])for(let j=0;j<8;j++){const a=j*Math.PI/4,b=(j+1)*Math.PI/4;silk([Math.cos(a)*r,Math.sin(a)*r,0],[Math.cos(b)*r,Math.sin(b)*r,0]);}
  for(const a of [.7,2.6,4.2])ball(g,'#eef4da',[Math.cos(a)*.65,Math.sin(a)*.65,.06],[.045,.055,.04],0);
 }
 else if(id==='sack'){
  const points=[new T.Vector2(0,-.6),new T.Vector2(.38,-.53),new T.Vector2(.49,-.12),new T.Vector2(.29,.34),new T.Vector2(.31,.52)];mesh(g,new T.LatheGeometry(points,8),'#c6a46d');
  mesh(g,new T.TorusGeometry(.28,.055,5,10),'#765b35',[0,.4,0]).rotation.x=Math.PI/2;
  ball(g,'#76552e',[0,.47,0],[.26,.035,.25],1);
  for(const [x,z] of [[-.12,.05],[.08,.11],[.04,-.11]])ball(g,'#e7c378',[x,.5,z],[.1,.07,.12],1);
  rod(g,[-.17,-.31,.42],[.1,.14,.41],.025,'#82613a');
  for(const y of [-.2,-.07,.06])ball(g,'#e8d2a0',[y*.6,y,.45],[.08,.07,.025],0);
 }
 else if(id==='snake'||id==='snakebody'){
  ball(g,id==='snake'?'#879c53':'#75894a',[0,0,0],[id==='snake'?.37:.28,.65,.24],1);
  ball(g,'#d3c793',[0,-.16,.17],[.23,.37,.1],0);
  for(const y of [-.3,.08,.4])ball(g,'#4e693e',[0,y,.23],[.16,.1,.04],0);
  if(id==='snake'){for(const x of [-.23,.23]){ball(g,'#e7c874',[x,.32,.21],[.075,.08,.04]);ball(g,'#243f2d',[x,.34,.25],[.03,.06,.02]);}rod(g,[0,.59,.14],[0,.8,.12],.025,'#a85849');}
 }
 else if(id==='thornseeds'){ball(g,'#b8a574',[0,0,0],[.45,.48,.43],0);for(let i=0;i<9;i++){const a=i*Math.PI*2/9,m=cone(g,[Math.cos(a)*.48,Math.sin(a)*.48,0],.1,.35,'#a59865');m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.cos(a),Math.sin(a),0));}}
 else if(id==='fallingdebris'){
  // Uneven chipped planes, without fine details that disappear in the runtime sprite.
  const geo=new T.IcosahedronGeometry(1,0),positions=geo.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),scale=1+.16*Math.sin(x*7+y*4+z*5);
   positions.setXYZ(i,x*.59*scale+y*.12,y*.66*scale,z*.43*scale);
  }
  geo.computeVertexNormals();const m=mesh(g,geo,'#ac9473');m.rotation.set(.25,.1,.3);
  ball(g,'#d1b994',[-.28,.22,.28],[.24,.17,.16],0);
 }
 else if(id==='hail'){const m=ball(g,'#c4d8dd',[0,0,0],[.57,.63,.5],0);m.rotation.set(.25,.1,.3);}
 else if(id==='gust'||id==='heat')wind(g,id==='heat'?'#e0c69a':'#e0ddc8',id==='heat');
 return g;
}

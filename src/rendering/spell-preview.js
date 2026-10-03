import * as THREE from 'three';

// Terrain-following border only: no caster, navigation obstacle or spell VFX.
export class SpellPreview {
  constructor(scene,surface){
    this.scene=scene;this.surface=surface;
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(96*2*3),3));
    const indices=[];for(let i=0;i<96;i++){const a=i*2,b=((i+1)%96)*2;indices.push(a,b,a+1,a+1,b,b+1);}this.geometry.setIndex(indices);
    this.material=new THREE.MeshBasicMaterial({color:'#91d7a7',side:THREE.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false});
    this.line=new THREE.Mesh(this.geometry,this.material);this.line.visible=false;this.line.renderOrder=1000;
    scene.add(this.line);
  }
  show(draft){
    if(!Number.isFinite(draft.radius)||!Number.isFinite(draft.x)||!Number.isFinite(draft.z)){this.clear();return;}
    const key=[draft.x,draft.z,draft.radius,draft.valid].join(':');
    if(this.key===key)return;this.key=key;
    const position=this.geometry.getAttribute('position'),floor=this.surface(draft.x,draft.z);
    this.line.position.set(draft.x,floor+.08,draft.z);
    for(let i=0;i<position.count;i++){
      // Outer edge is the exact gameplay boundary; the band extends inward.
      const angle=Math.floor(i/2)/96*Math.PI*2,radius=draft.radius-(i%2)*.14,x=draft.x+Math.cos(angle)*radius,z=draft.z+Math.sin(angle)*radius;
      position.setXYZ(i,x-draft.x,this.surface(x,z)-floor,z-draft.z);
    }
    position.needsUpdate=true;this.geometry.computeBoundingSphere();
    this.material.color.set(draft.valid?'#91d7a7':'#ed7767');this.line.visible=true;
  }
  clear(){this.key=null;this.line.visible=false;}
  dispose(){this.scene.remove(this.line);this.geometry.dispose();this.material.dispose();}
}

// Scene graph events discover only entering/leaving subtrees. Direct material
// replacement must call refresh(mesh); Three does not emit a material-change event.
// This registry borrows materials and never disposes their GPU resources.
export class SceneMaterialRegistry {
  constructor(root,toon){
    this.root=root;this.toon=toon;this.nodes=new Set();this.meshes=new Map();this.materials=new Map();this.waters=new Map();
    this.enabled=true;this.revision=0;this.lastRevision=-1;this.lastClock=undefined;this.disposed=false;
    this.stats={discoveredNodes:0,refreshedMeshes:0,legacyScans:0,waterWrites:0};
    this.added=event=>this.attach(event.child);this.removed=event=>this.detach(event.child);
    this.attach(root);
  }
  observe(material){
    this.toon.material(material);
    const water=material.userData?.paintUniforms;
    if(water){if(this.waters.get(material)!==water){this.waters.set(material,water);this.revision++;}}
    else if(this.waters.delete(material))this.revision++;
  }
  refreshMesh(mesh){
    const previous=this.meshes.get(mesh)??new Set(),next=new Set((Array.isArray(mesh.material)?mesh.material:[mesh.material]).filter(Boolean));
    for(const material of previous)if(!next.has(material))this.release(material);
    for(const material of next){
      if(!previous.has(material))this.materials.set(material,(this.materials.get(material)??0)+1);
      this.observe(material);
    }
    this.meshes.set(mesh,next);
  }
  release(material){
    const count=this.materials.get(material)-1;
    if(count>0)this.materials.set(material,count);
    else{this.materials.delete(material);if(this.waters.delete(material))this.revision++;}
  }
  attach(root){
    if(this.disposed||root.userData.materialRegistryExcluded||this.nodes.has(root))return;
    this.nodes.add(root);this.stats.discoveredNodes++;
    root.addEventListener('childadded',this.added);root.addEventListener('childremoved',this.removed);
    if(root.isMesh)this.refreshMesh(root);
    for(const child of root.children)this.attach(child);
  }
  detach(root){
    if(!this.nodes.delete(root))return;
    root.removeEventListener('childadded',this.added);root.removeEventListener('childremoved',this.removed);
    for(const material of this.meshes.get(root)??[])this.release(material);
    this.meshes.delete(root);
    for(const child of root.children)this.detach(child);
  }
  refresh(root){
    if(this.disposed)return;
    root.traverse(node=>{if(node.isMesh&&this.nodes.has(node)){this.refreshMesh(node);this.stats.refreshedMeshes++;}});
  }
  update(clock){
    if(this.disposed)return;
    if(!this.enabled){
      // QA baseline retains the former two complete scene traversals.
      this.toon.apply(this.root);this.root.traverse(node=>{
        for(const material of node.isMesh?(Array.isArray(node.material)?node.material:[node.material]):[]){
          if(material?.userData.paintUniforms){material.userData.paintUniforms.uTime.value=clock;this.stats.waterWrites++;}
        }
      });this.stats.legacyScans+=2;this.lastClock=undefined;return;
    }
    if(clock===this.lastClock&&this.revision===this.lastRevision)return;
    for(const water of this.waters.values())if(water.uTime.value!==clock){water.uTime.value=clock;this.stats.waterWrites++;}
    this.lastClock=clock;this.lastRevision=this.revision;
  }
  dispose(){
    if(this.disposed)return;
    this.detach(this.root);this.disposed=true;
    this.nodes.clear();this.meshes.clear();this.materials.clear();this.waters.clear();
  }
}

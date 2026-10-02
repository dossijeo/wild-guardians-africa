import * as THREE from 'three';
import {wallStages,morphedWallPositions} from './walls-native.js';

// Original getVAO expands indexed faces so each triangle keeps ONE region.
export function wallBridge(source,destination=null){
  const count=source.i.length,pos=new Float32Array(count*3),normal=new Float32Array(count*3),uv=new Float32Array(count*2),roots=new Float32Array(count*3),peers=new Float32Array(count*3),targets=new Float32Array(count*3),targetNormals=new Float32Array(count*3);
  for(let face=0;face<count/3;face++){
    const region=source.faceRegions[face],root=destination?source.regions[region].root:[0,0,0],peer=destination?destination.peers[region]:root;
    for(let j=0;j<3;j++){
      const at=face*3+j,vi=source.i[at];pos.set(source.p.subarray(vi*3,vi*3+3),at*3);normal.set(source.n.subarray(vi*3,vi*3+3),at*3);uv.set(source.uv.subarray(vi*2,vi*2+2),at*2);roots.set(root,at*3);peers.set(peer,at*3);targets.set((destination?.p??source.p).subarray(vi*3,vi*3+3),at*3);targetNormals.set((destination?.n??source.n).subarray(vi*3,vi*3+3),at*3);
    }
  }
  return {pos,normal,uv,roots,peers,targets,targetNormals,lastMorph:NaN,morphed:null};
}

export class NativeWall extends THREE.Group {
  constructor(prototypes,entity){
    super();this.prototypes=prototypes;this.entityId=entity.id;this.parts=[];
    this.userData.entityId=entity.id;this.userData.nativeWall=true;
    const scale=entity.gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[entity.material]??1):1;this.scale.setScalar(scale);
    this.update(entity);
  }
  update(entity,seconds){
    const target=entity.hp/entity.maxHp;let visual=target;
    if(entity.status==='ruined')visual=0;
    else if(entity.status==='collapsing'){
      if(this.lastStatus!=='collapsing')this.collapseFromVisual=this.visual??target;
      const t=Math.max(0,Math.min(1,1-entity.collapseRemaining/1.4));visual=this.collapseFromVisual*(1-t*t*(3-2*t));
    }else if(seconds!==undefined&&this.visual!==undefined){
      if(this.target!==target){this.target=target;this.from=this.visual;this.damageAge=0;}
      else this.damageAge=(this.damageAge??0)+Math.max(0,seconds);
      const t=Math.min(1,this.damageAge/.48);visual=this.from+(target-this.from)*(1-(1-t)**3);
    }
    this.lastStatus=entity.status;
    if(entity.status!=='intact'||seconds===undefined){this.target=target;this.from=visual;this.damageAge=.48;}
    if(this.visual===visual&&this.gate===entity.gate)return;
    this.visual=visual;this.gate=entity.gate;
    this.scale.setScalar(entity.gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[entity.material]??1):1);
    const stages=wallStages({material:entity.material,kind:entity.gate?'gate':'wall',visual});
    const key=stages.map(s=>s.key+'>'+s.dest).join('|');
    if(key!==this.stageKey){
      this.disposeParts();this.stageKey=key;
      for(const stage of stages){
        const prototype=this.prototypes[stage.key],source=prototype.userData.nativePiece;
        const bridge=wallBridge(source,stage.dest?source.morph[stage.dest]:null),geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(bridge.pos.slice(),3));geometry.setAttribute('normal',new THREE.BufferAttribute(bridge.normal.slice(),3));geometry.setAttribute('uv',new THREE.BufferAttribute(bridge.uv,2));
        const material=prototype.material.clone();material.polygonOffset=stage.role===1;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;
        const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;this.add(mesh);this.parts.push({mesh,bridge});
      }
    }
    stages.forEach((stage,i)=>{
      const {mesh,bridge}=this.parts[i],positions=morphedWallPositions(bridge,stage.morph),normals=mesh.geometry.attributes.normal.array;
      // Same quintic ease and normal interpolation as native MORPH_VS.
      const p=Math.max(0,Math.min(1,stage.morph)),t=p*p*p*(p*(p*6-15)+10);
      for(let j=0;j<normals.length;j++)normals[j]=bridge.normal[j]+(bridge.targetNormals[j]-bridge.normal[j])*t;
      for(let j=0;j<normals.length;j+=3)if(normals[j]**2+normals[j+1]**2+normals[j+2]**2<.0001)normals.set(bridge.normal.subarray(j,j+3),j);
      mesh.geometry.attributes.position.array.set(positions);mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.attributes.normal.needsUpdate=true;
      mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
    });
  }
  disposeParts(){for(const {mesh} of this.parts){mesh.geometry.dispose();mesh.material.dispose();this.remove(mesh);}this.parts=[];}
  dispose(){this.disposeParts();}
}

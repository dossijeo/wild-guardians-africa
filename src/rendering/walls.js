import {awakeningVisible,awakeningVisibleAt} from './awakening-presentation.js';
import * as THREE from 'three';
import {wallVisualAt} from '../simulation/structure-presentation.js';
import {wallStages,morphedWallPositions} from './walls-native.js';
import {nativeGateLeaves} from '../world/gate-frames-native.js';
import {splitGateBridge,articulateGate} from './gate-articulation.js';
import {structureMaterialReplica} from './structure-material-replica.js';

// Original getVAO expands indexed faces so each triangle keeps ONE region.
export function wallBridge(source,destination=null){
  const count=source.i.length,pos=new Float32Array(count*3),normal=new Float32Array(count*3),uv=new Float32Array(count*2),roots=new Float32Array(count*3),peers=new Float32Array(count*3),targets=new Float32Array(count*3),targetNormals=new Float32Array(count*3);
  const visibility=source.visibility?new Float32Array(count):null,color=source.color?new Float32Array(count*3):null;
  for(let face=0;face<count/3;face++){
    const region=source.faceRegions[face],root=destination?source.regions[region].root:[0,0,0],peer=destination?destination.peers[region]:root;
    for(let j=0;j<3;j++){
      const at=face*3+j,vi=source.i[at];if(visibility)visibility[at]=source.visibility[vi]/255;if(color)for(let c=0;c<3;c++)color[at*3+c]=source.color[vi*3+c]/255;pos.set(source.p.subarray(vi*3,vi*3+3),at*3);normal.set(source.n.subarray(vi*3,vi*3+3),at*3);uv.set(source.uv.subarray(vi*2,vi*2+2),at*2);roots.set(root,at*3);peers.set(peer,at*3);targets.set((destination?.p??source.p).subarray(vi*3,vi*3+3),at*3);targetNormals.set((destination?.n??source.n).subarray(vi*3,vi*3+3),at*3);
    }
  }
  return {pos,normal,uv,roots,peers,targets,targetNormals,...(visibility?{visibility}:{}),...(color?{color}:{}),lastMorph:NaN,morphed:null};
}

export class NativeWall extends THREE.Group {
  constructor(prototypes,entity,elapsed,{previous=null}={}){
    super();this.prototypes=prototypes;this.entityId=entity.id;this.nativeGateMaterial=entity.material;this.parts=[];this.blessingUniform={value:new THREE.Vector4()};
    if(previous){this.lastStatus=previous.lastStatus;this.visual=previous.visual;this.collapseFromVisual=previous.collapseFromVisual;}
    this.userData.entityId=entity.id;this.userData.nativeWall=true;
    const scale=entity.gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[entity.material]??1):1;this.scale.setScalar(scale);
    this.update(entity,undefined,elapsed);
  }
  // Settlement updates use undefined seconds. Predict the topology without
  // mutating this wall, so the visible phase remains available during setup.
  nextConfirmedStageKey(entity,elapsed){
    const target=entity.hp/entity.maxHp;let visual=target;
    if(entity.wallPresentation&&(Number.isFinite(elapsed)||entity.status==='collapsing'))visual=wallVisualAt(entity,elapsed??entity.wallPresentation.at);
    else if(entity.status==='ruined')visual=0;
    else if(entity.status==='collapsing'){
      const from=this.lastStatus!=='collapsing'?(this.visual??target):this.collapseFromVisual;
      const t=Math.max(0,Math.min(1,1-entity.collapseRemaining/1.4));visual=from*(1-t*t*(3-2*t));
    }
    return wallStages({material:entity.material,kind:entity.gate?'gate':'wall',visual}).map(stage=>stage.key+'>'+stage.dest).join('|');
  }
  update(entity,seconds,elapsed){
    this.blessingUniform.value.set(awakeningVisible(entity,elapsed)?1:0,awakeningVisibleAt(entity),entity.blessing?(this.blessingDamageAt??-1000):0,this.awakeningSelecting&&!entity.blessing&&entity.status==='intact'?(this.awakeningSelected?2:1):0);
    if(this.nativeGateBinding){
      if(entity.gate!==true||entity.status!=='intact'||entity.hp!==entity.maxHp||entity.material!==this.nativeGateMaterial)
        throw Error('Native gate binding requires an explicit geometry/lifecycle transition');
      this.applyNativeGatePose(entity.nativeGatePose);return;
    }
    const target=entity.hp/entity.maxHp;let visual=target;
    if(entity.wallPresentation&&(Number.isFinite(elapsed)||entity.status==='collapsing'))visual=wallVisualAt(entity,elapsed??entity.wallPresentation.at);
    else if(entity.status==='ruined')visual=0;
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
    const opening=entity.status==='ruined'?0:Math.max(0,Math.min(1,entity.gateOpen??0));
    if(this.visual===visual&&this.gate===entity.gate&&this.gateOpen===opening)return;
    this.visual=visual;this.gate=entity.gate;this.gateOpen=opening;
    const scale=entity.gate?({adobe:1.4,piedra:1.4,reforzado:1.6}[entity.material]??1):1;
    this.scale.set((entity.baseScaleX??1)*scale,scale,scale);
    const stages=wallStages({material:entity.material,kind:entity.gate?'gate':'wall',visual});
    const key=stages.map(s=>s.key+'>'+s.dest).join('|');
    if(key!==this.stageKey){
      this.disposeParts();this.stageKey=key;
      for(const stage of stages){
        const prototype=this.prototypes[stage.key],source=prototype.userData.nativePiece;
        let bridge=wallBridge(source,stage.dest?source.morph[stage.dest]:null);
        if(stage.key.endsWith('_puerta')&&nativeGateLeaves[entity.material])bridge=splitGateBridge(bridge,nativeGateLeaves[entity.material]);
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(bridge.pos.slice(),3));geometry.setAttribute('normal',new THREE.BufferAttribute(bridge.normal.slice(),3));geometry.setAttribute('uv',new THREE.BufferAttribute(bridge.uv,2));
        if(bridge.color)geometry.setAttribute('color',new THREE.BufferAttribute(bridge.color,3));
        if(bridge.visibility)geometry.setAttribute('ambientVisibility',new THREE.BufferAttribute(bridge.visibility.slice(),1));
        const material=prototype.material.clone(),releaseMaterialReplica=prototype.material[structureMaterialReplica]?.(material);material.polygonOffset=stage.role===1;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;material.userData.blessingObject=this.blessingUniform;
        geometry.computeBoundingBox();const bounds=geometry.boundingBox;material.userData.blessingWallBounds={value:new THREE.Vector4(bounds.min.x,bounds.min.y,Math.max(.01,bounds.max.x-bounds.min.x),Math.max(.01,bounds.max.y-bounds.min.y))};
        const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;this.add(mesh);this.parts.push({mesh,bridge,releaseMaterialReplica});
      }
    }
    stages.forEach((stage,i)=>{
      const {mesh,bridge}=this.parts[i],positions=morphedWallPositions(bridge,stage.morph),normals=mesh.geometry.attributes.normal.array;
      // Same quintic ease and normal interpolation as native MORPH_VS.
      const p=Math.max(0,Math.min(1,stage.morph)),t=p*p*p*(p*(p*6-15)+10);
      for(let j=0;j<normals.length;j++)normals[j]=bridge.normal[j]+(bridge.targetNormals[j]-bridge.normal[j])*t;
      for(let j=0;j<normals.length;j+=3)if(normals[j]**2+normals[j+1]**2+normals[j+2]**2<.0001)normals.set(bridge.normal.subarray(j,j+3),j);
      mesh.geometry.attributes.position.array.set(articulateGate(bridge,opening,positions,normals));mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.attributes.normal.needsUpdate=true;
      const ao=mesh.geometry.attributes.ambientVisibility;if(ao){const release=Math.sin(Math.PI*t);for(let k=0;k<ao.count;k++){const fade=Math.max(release,bridge.leafFlags?.[k]?opening:0);ao.array[k]=bridge.visibility[k]+(1-bridge.visibility[k])*fade;}ao.needsUpdate=true;}
      mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
    });
  }
  bindNativeGateMechanism(mechanism){
    const model={zarzas:1,empalizada:2,reforzado:3}[this.nativeGateMaterial],part=this.parts[0];
    if(this.nativeGateBinding||!this.gate||this.visual!==1||this.lastStatus!=='intact'||this.parts.length!==1||
       mechanism?.version!==1||mechanism.entityId!==this.entityId||mechanism.modelId!==model||mechanism.collisionModel!=='kinematic-union'||
       !mechanism.authorityEpoch||!Number.isSafeInteger(mechanism.nativeSession)||mechanism.nativeSession<1||
       !Number.isSafeInteger(mechanism.mechanism)||mechanism.mechanism<1||
       mechanism.positions?.length!==part?.bridge.pos.length||mechanism.leafFlags?.length!==part?.bridge.leafFlags?.length)
      throw Error('Invalid native gate mechanism binding');
    for(let i=0;i<mechanism.positions.length;i++)if(!Number.isFinite(mechanism.positions[i])||Math.abs(mechanism.positions[i]-part.bridge.pos[i])>1e-6)
      throw Error('Native gate geometry does not match the authored render mesh');
    for(let i=0;i<mechanism.leafFlags.length;i++)if(mechanism.leafFlags[i]!==part.bridge.leafFlags[i])
      throw Error('Native gate partition does not match the authored render mesh');
    this.nativeGateBinding=Object.freeze({authorityEpoch:mechanism.authorityEpoch,nativeSession:mechanism.nativeSession,
      entityId:mechanism.entityId,modelId:mechanism.modelId,mechanism:mechanism.mechanism});
    part.bridge.pos=Float32Array.from(mechanism.positions);this.applyNativeGatePose(mechanism);
  }
  applyNativeGatePose(pose){
    const binding=this.nativeGateBinding;
    if(!binding||pose?.version!==1||pose.collisionModel!=='kinematic-union'||
       Object.entries(binding).some(([key,value])=>pose[key]!==value)||
       !Number.isFinite(pose.sampledAt)||pose.sampledAt<(this.nativeGateTime??-Infinity)||
       !Number.isFinite(pose.opening)||pose.opening<0||pose.opening>1||
       pose.rootMatrix?.length!==16||pose.leafMatrix?.length!==16||
       !pose.rootMatrix.every(Number.isFinite)||!pose.leafMatrix.every(Number.isFinite))
      throw Error('Native gate pose is missing, obsolete or from another mechanism');
    const {mesh,bridge}=this.parts[0],positions=mesh.geometry.attributes.position.array,normals=mesh.geometry.attributes.normal.array,m=pose.leafMatrix;
    // Only apply the authority's matrices. No opening clock, hinge decision,
    // ground sampling or collision predicate exists in this bound draw path.
    for(let i=0;i<bridge.leafFlags.length;i++){const at=i*3,x=bridge.pos[at],y=bridge.pos[at+1],z=bridge.pos[at+2],
      nx=bridge.normal[at],ny=bridge.normal[at+1],nz=bridge.normal[at+2];
      if(bridge.leafFlags[i]){
        positions[at]=m[0]*x+m[4]*y+m[8]*z+m[12];positions[at+1]=m[1]*x+m[5]*y+m[9]*z+m[13];positions[at+2]=m[2]*x+m[6]*y+m[10]*z+m[14];
        normals[at]=m[0]*nx+m[4]*ny+m[8]*nz;normals[at+1]=m[1]*nx+m[5]*ny+m[9]*nz;normals[at+2]=m[2]*nx+m[6]*ny+m[10]*nz;
      }else{positions.set(bridge.pos.subarray(at,at+3),at);normals.set(bridge.normal.subarray(at,at+3),at);}
    }
    this.matrixAutoUpdate=false;this.matrix.fromArray(pose.rootMatrix);this.position.set(pose.rootMatrix[12],pose.rootMatrix[13],pose.rootMatrix[14]);this.matrixWorldNeedsUpdate=true;
    this.nativeGateTime=pose.sampledAt;this.gateOpen=pose.opening;
    mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.attributes.normal.needsUpdate=true;
    const ao=mesh.geometry.attributes.ambientVisibility;if(ao){for(let i=0;i<ao.count;i++)ao.array[i]=bridge.visibility[i]+(1-bridge.visibility[i])*(bridge.leafFlags[i]?pose.opening:0);ao.needsUpdate=true;}
    mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
  }
  disposeParts(){for(const {mesh,releaseMaterialReplica} of this.parts){releaseMaterialReplica?.();mesh.geometry.dispose();mesh.material.dispose();this.remove(mesh);}this.parts=[];}
  dispose(){this.disposeParts();}
}

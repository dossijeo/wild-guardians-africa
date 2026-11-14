// Reuse an admitted object's geometry/materials. Only its proposed placement is
// recorded; the existing chunk transaction owns confirmation and rollback.
export function createPreparedTerrainPlacement({object,entity,previousHeight,nextHeight,offset=.025,isCurrent,signal=null}={}){
 if(!object?.isObject3D||!object.parent?.isScene||object.matrixAutoUpdate!==true||!entity||![entity.x,entity.z,offset,...object.position.toArray(),...object.quaternion.toArray(),...object.scale.toArray()].every(Number.isFinite)||[previousHeight,nextHeight].some(y=>y!==null&&!Number.isFinite(y))||typeof isCurrent!=='function'||signal!==null&&(typeof signal?.addEventListener!=='function'||typeof signal?.removeEventListener!=='function'))throw TypeError('Invalid prepared terrain placement');
 const parent=object.parent,position=object.position.clone(),quaternion=object.quaternion.clone(),scale=object.scale.clone(),visible=object.visible,nextPosition=nextHeight===null?position.clone():position.clone().set(entity.x,nextHeight+offset,entity.z),nextVisible=nextHeight!==null,controller=new AbortController();
 const terrainSupport=Object.freeze({entity,x:entity.x,z:entity.z,previousHeight,nextHeight});
 let active=true,activated=false,attached=false,finalized=false;
 const valid=()=>active&&!controller.signal.aborted&&isCurrent()===true&&object.parent===parent&&object.matrixAutoUpdate===true&&object.quaternion.equals(quaternion)&&object.scale.equals(scale)&&object.position.equals(attached?nextPosition:position)&&object.visible===(attached?nextVisible:visible);
 const check=()=>{if(!valid())throw Error('Prepared terrain placement became stale');};
 const restore=()=>{if(!attached)return;if(object.parent!==parent||!object.position.equals(nextPosition)||object.visible!==nextVisible)throw Error('Prepared terrain placement ownership changed');object.position.copy(position);object.visible=visible;object.updateWorldMatrix(true,true);attached=false;};
 const detach=()=>signal?.removeEventListener('abort',abort);
 function abort(){if(!active)return false;if(attached)restore();active=false;detach();controller.abort();return true;}
 signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();throw new DOMException('Prepared terrain placement cancelled','AbortError');}
 return {object,include:[object],signal:controller.signal,terrainSupport,valid,eventRoots:()=>[object],
  presentation:()=>({show:nextVisible?[object]:[],hide:nextVisible?[]:[object],placements:[{object,position:nextPosition.toArray()}]}),
  activate(){check();if(activated)throw Error('Terrain placement already activated');activated=true;return true;},
  attach(){check();if(!activated||attached)throw Error('Terrain placement not activated');object.position.copy(nextPosition);object.visible=nextVisible;object.updateWorldMatrix(true,true);attached=true;},
  rollback:restore,
  finalize(){check();if(!attached||finalized)throw Error('Terrain placement not attached');finalized=true;return {retire(){check();active=false;attached=false;detach();},notify(){}};},
  rollbackFinalized(){finalized=false;},cancel:abort};
}

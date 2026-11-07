import {Vector3} from 'three';

// The initial cursor is only an input acknowledgement. Once terrain picking
// succeeds it follows the chosen world point until the worker takes over.
export function createStructureInputFeedback({stage,camera,canvas,documentRef=document}={}){
 if(!stage||!camera?.isCamera||!canvas||!documentRef?.createElement)throw TypeError('Invalid structure input feedback');
 const active=new Set(),byId=new Map(),vector=new Vector3();let closed=false;
 function remove(item){if(!active.delete(item))return;if(item.id)byId.delete(item.id);item.element.remove();}
 return {
  start({clientX,clientY},scope=null){if(closed||![clientX,clientY].every(Number.isFinite))return null;const element=documentRef.createElement('div');element.setAttribute('aria-hidden','true');Object.assign(element.style,{position:'fixed',pointerEvents:'none',zIndex:'5',width:'32px',height:'32px',margin:'-16px 0 0 -16px',border:'2px solid rgba(215,237,173,.9)',borderRadius:'50%',boxShadow:'0 0 10px rgba(191,220,146,.6)',left:clientX+'px',top:clientY+'px'});stage.append(element);const item={element,id:null,point:null,scope};active.add(item);return {bind(id,point,currentScope=scope){if(!active.has(item)||currentScope!==scope||typeof id!=='string'||!id||byId.has(id)||![point?.x,point?.y,point?.z].every(Number.isFinite))return false;item.id=id;item.point={x:point.x,y:point.y,z:point.z};byId.set(id,item);return true;},cancel(){remove(item);},cancelUnlessBound(){if(!item.id)remove(item);}};},
  remove(id,scope=undefined){const item=byId.get(id);if(item&&(scope===undefined||item.scope===scope))remove(item);},
  clearScope(scope){for(const item of [...active])if(item.scope===scope)remove(item);},
  update(){if(closed||!active.size)return;camera.updateMatrixWorld();const rect=canvas.getBoundingClientRect();for(const item of active){if(!item.point)continue;vector.set(item.point.x,item.point.y,item.point.z).project(camera);const visible=vector.z>=-1&&vector.z<=1&&Math.abs(vector.x)<=1&&Math.abs(vector.y)<=1;item.element.style.display=visible?'':'none';if(visible){item.element.style.left=(rect.left+(vector.x+1)*rect.width/2)+'px';item.element.style.top=(rect.top+(1-vector.y)*rect.height/2)+'px';}}},
  dispose(){closed=true;for(const item of [...active])remove(item);}
 };
}

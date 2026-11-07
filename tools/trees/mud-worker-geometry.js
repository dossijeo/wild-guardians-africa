import {BufferGeometry,BufferAttribute} from 'three';
// Experimental: caller must validate ownership/version before making visible.
export function rebuildMudGeometry(result){
 if(result===null)return null;
 const {position,normal,uv,userData}=result;
 if(!(position instanceof Float32Array)||!(normal instanceof Float32Array)||!(uv instanceof Float32Array)||position.length%9||normal.length!==position.length||uv.length!==position.length/3*2)throw Error('Invalid mud worker geometry');
 const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(position,3));g.setAttribute('normal',new BufferAttribute(normal,3));g.setAttribute('uv',new BufferAttribute(uv,2));g.userData=userData;g.computeBoundingBox();g.computeBoundingSphere();return g;
}

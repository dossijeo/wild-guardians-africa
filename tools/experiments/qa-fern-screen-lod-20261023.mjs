// QA-only source transform: preserve candidate set and far cutoff, change only LOD bin.
export function screenLodSource(body){
 const declaration="const old=world.scene.onBeforeRender,frustum=";
 const selection="bins[q.variant==='C'&&dist<q.nearDistance?0:1].push(p);";
 if(body.split(declaration).length!==2||body.split(selection).length!==2)throw Error('Screen LOD anchors changed');
 body=body.replace(declaration,"let qaScreenLod=new WeakMap();q.qaResetScreenLod=()=>{qaScreenLod=new WeakMap();q.dirty=true;};"+declaration);
 return body.replace(selection,`const v=camera.matrixWorldInverse.elements,x=p[0]+world.scene.position.x,y=p[1]+world.scene.position.y,z=p[2]+world.scene.position.z,depth=-(v[2]*x+v[6]*y+v[10]*z+v[14]);const pixels=depth>0?world.renderer.domElement.height*camera.projectionMatrix.elements[5]/depth:Infinity;const previous=qaScreenLod.get(p);const detailed=q.nearDistance>0&&(previous===undefined?pixels>=64:previous?pixels>=60:pixels>=68);qaScreenLod.set(p,detailed);bins[q.variant==='C'&&detailed?0:1].push(p);`);
}

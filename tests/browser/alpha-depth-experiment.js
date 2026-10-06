// QA only. Stock alpha depth remains disabled in gameplay after earlier mixed
// readbacks differed. This adapter permits repeating that experiment on current
// rendered farms without changing the production eligibility rule.
import {standardDepthMaterial} from '../../src/rendering/standard-depth.js';
export class AlphaDepthExperiment {
 constructor(pass){
  this.pass=pass;this.enabled=false;this.applications=0;
  const owner=this;this.original=pass.captureDepth;
  this.capture=function(camera,scene){
   if(!owner.enabled)return owner.original.call(this,camera,scene);
   const saved=[];
   try{
    scene.traverseVisible(object=>{
     const source=object.material;
     if(!source||Array.isArray(source)||!source.alphaTest||object.customDepthMaterial)return;
     const depth=standardDepthMaterial(source);if(!depth)return;
     saved.push([object,object.customDepthMaterial,Object.hasOwn(object,'customDepthMaterial')]);
     object.customDepthMaterial=depth;owner.applications++;
    });
    return owner.original.call(this,camera,scene);
   }finally{for(const [object,depth,owned] of saved){if(owned)object.customDepthMaterial=depth;else delete object.customDepthMaterial;}}
  };
  pass.captureDepth=this.capture;
 }
 setEnabled(enabled){this.enabled=Boolean(enabled);}
 dispose(){if(this.pass.captureDepth===this.capture)this.pass.captureDepth=this.original;this.enabled=false;}
}

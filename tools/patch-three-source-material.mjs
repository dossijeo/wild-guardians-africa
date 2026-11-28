/*
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
// Backport the override source-material identity/lifetime from Three
// 253fa7ad003181df28015efdb541c2916895a816, RenderObjects/RenderObject/Renderer.
// Keep r180's scratch key array and existing shadow graph validation.
function once(source,before,after,label){
 if(source.split(after).length===2)return source;
 if(source.split(before).length!==2)throw Error(`Unexpected Three.js ${label} implementation`);
 return source.replace(before,after);
}
function patchClass(source,name,patch){
 const start=source.indexOf(`class ${name} {`),end=source.indexOf('\n}\n',start);
 if(start<0||end<0||source.indexOf(`class ${name} {`,start+1)>=0)throw Error(`Unexpected Three.js ${name} implementation`);
 return source.slice(0,start)+patch(source.slice(start,end+3))+source.slice(end+3);
}
export function patchOverrideRendererSource(source){return patchClass(source,'Renderer',value=>{
 value=once(value,'this._currentRenderContext = null;','this._currentRenderContext = null;\n\t\tthis._currentSourceMaterial = null;','source material initialization');
 value=once(value,'\t\tlet overrideDepthNode;','\t\tlet overrideDepthNode;\n\t\tconst previousSourceMaterial = this._currentSourceMaterial;\n\t\tthis._currentSourceMaterial = null;\n\t\ttry {','source material scope');
 value=once(value,'\t\t\tconst overrideMaterial = scene.overrideMaterial;','\t\t\tconst overrideMaterial = scene.overrideMaterial;\n\t\t\tthis._currentSourceMaterial = material;','source material capture');
 value=once(value,'\t\tif ( overridePositionNode !== undefined ) {','\t\t} finally {\n\n\t\tif ( overridePositionNode !== undefined ) {','source material restoration');
 return once(value,'\t\tobject.onAfterRender( this, scene, camera, geometry, material, group );','\t\tthis._currentSourceMaterial = previousSourceMaterial;\n\t\t}\n\n\t\tobject.onAfterRender( this, scene, camera, geometry, material, group );','source material scope end');
});}
export function patchOverrideRenderObjectsSource(source){return patchClass(source,'RenderObjects',value=>{
 value=once(value,'\t\t// reuse chainArray','\t\tconst sourceMaterial = this.renderer._currentSourceMaterial ?? null;\n\t\tconst sourceMaterialVersion = sourceMaterial !== null ? sourceMaterial.version : 0;\n\n\t\t// reuse chainArray','source material key');
 // Bundled r180 renames the scratch array, e.g. _chainKeys$5.
 const key=value.match(/(_chainKeys(?:\$\d+)?)\[ 3 \] = lightsNode;/)?.[1];
 if(!key)throw Error('Unexpected Three.js source material chain key implementation');
 value=once(value,`${key}[ 3 ] = lightsNode;`,`${key}[ 3 ] = lightsNode;\n\t\tif ( sourceMaterial !== null ) ${key}[ 4 ] = sourceMaterial;`,'source material fifth key');
 value=once(value,'renderObject.version !== material.version || renderObject.needsUpdate','renderObject.version !== material.version || renderObject.sourceMaterialVersion !== sourceMaterialVersion || renderObject.needsUpdate','source material version check');
 return once(value,'renderObject.version = material.version;','renderObject.version = material.version;\n\t\t\t\t\trenderObject.sourceMaterialVersion = sourceMaterialVersion;','source material version update');
});}
export function patchOverrideRenderObjectSource(source){return patchClass(source,'RenderObject',value=>{
 value=once(value,'this.material = material;','this.material = material;\n\t\tthis._sourceMaterial = renderer._currentSourceMaterial ?? null;\n\t\tthis.sourceMaterialVersion = this._sourceMaterial !== null ? this._sourceMaterial.version : 0;','source material owner');
 value=once(value,"this.material.addEventListener( 'dispose', this.onMaterialDispose );","this.material.addEventListener( 'dispose', this.onMaterialDispose );\n\t\tif ( this._sourceMaterial !== null ) this._sourceMaterial.addEventListener( 'dispose', this.onMaterialDispose );",'source material listener');
 value=once(value,'return [ this.object, this.material, this.context, this.lightsNode ];','if ( this._sourceMaterial !== null ) return [ this.object, this.material, this.context, this.lightsNode, this._sourceMaterial ];\n\t\treturn [ this.object, this.material, this.context, this.lightsNode ];','source material disposal key');
 return once(value,"this.material.removeEventListener( 'dispose', this.onMaterialDispose );","this.material.removeEventListener( 'dispose', this.onMaterialDispose );\n\t\tif ( this._sourceMaterial !== null ) this._sourceMaterial.removeEventListener( 'dispose', this.onMaterialDispose );",'source material listener release');
});}

export function patchOverrideChainMapSource(source){return patchClass(source,'ChainMap',value=>{
 value=once(value,'this.weakMap = new WeakMap();','this.weakMaps = {};','chain map length owners');
 const method=`\t_getWeakMap( keys ) {

\t\tconst length = keys.length;
\t\tlet weakMap = this.weakMaps[ length ];
\t\tif ( weakMap === undefined ) {
\t\t\tweakMap = new WeakMap();
\t\t\tthis.weakMaps[ length ] = weakMap;
\t\t}
\t\treturn weakMap;

\t}

`;
 value=once(value,'\tget( keys ) {',method+'\tget( keys ) {','chain map length lookup');
 const before='let map = this.weakMap;',after='let map = this._getWeakMap( keys );';
 if(value.split(after).length===4)return value;
 if(value.split(before).length!==4)throw Error('Unexpected Three.js chain map access implementation');
 return value.replaceAll(before,after);
});}

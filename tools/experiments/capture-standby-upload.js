import {standbyTreeKey} from './native-tree-standby.js';

// QA only: read the buffers bound to the actual draw, after Three has uploaded
// the current compact attributes. No buffer, program or VAO is rewritten.
export function readBoundFloatAttribute(gl,program,name,count,itemSize){
 const location=gl.getAttribLocation(program,name);if(location<0)throw Error('Missing draw attribute '+name);
 const buffer=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),type=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_TYPE),stride=gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_STRIDE)||itemSize*4,offset=gl.getVertexAttribOffset(location,gl.VERTEX_ATTRIB_ARRAY_POINTER);
 if(!buffer||type!==gl.FLOAT||stride<itemSize*4)throw Error('Invalid draw attribute layout '+name);
 const previous=gl.getParameter(gl.COPY_READ_BUFFER_BINDING),length=count?((count-1)*stride+itemSize*4):0,data=new Float32Array(length/4),values=new Float32Array(count*itemSize);
 try{gl.bindBuffer(gl.COPY_READ_BUFFER,buffer);if(offset+length>gl.getBufferParameter(gl.COPY_READ_BUFFER,gl.BUFFER_SIZE))throw Error('Draw attribute exceeds buffer '+name);if(length)gl.getBufferSubData(gl.COPY_READ_BUFFER,offset,data);}
 finally{gl.bindBuffer(gl.COPY_READ_BUFFER,previous);}
 for(let i=0;i<count;i++)for(let j=0;j<itemSize;j++)values[i*itemSize+j]=data[i*stride/4+j];return values;
}
export function readStandbyProgramUniforms(gl,program){
 const values={};
 for(const name of ['uFineNoise','uNight','uNativeEnvEnabled','uEnvEndpoints']){
  const location=gl.getUniformLocation(program,name);
  if(location===null){values[name]={active:false,value:null};continue;}
  const value=gl.getUniform(program,location);values[name]={active:true,value:ArrayBuffer.isView(value)?Array.from(value):value};
 }
 return values;
}
export function captureStandbyUploads(world,adapters){
 const gl=world.renderer.getContext(),report={draws:[],errors:[],instances:0,matrixExact:0,visibilityExact:0,identityExact:0,passed:false},restore=[];
 for(const adapter of adapters)for(const record of adapter.standbyDraws()){
  const mesh=record.mesh,previous=mesh.onAfterRender;
  mesh.onAfterRender=function(...args){
   previous?.apply(this,args);try{
    const program=gl.getParameter(gl.CURRENT_PROGRAM),matrices=readBoundFloatAttribute(gl,program,'instanceMatrix',mesh.count,16),visibility=readBoundFloatAttribute(gl,program,'nativeVisibility',mesh.count,1),rows=[];
    for(let i=0;i<mesh.count;i++){
     const d=record.drawRows[i],preparedIndex=record.preparedRows.indexOf(d),logical=adapter.layer.current?.treeById.get(d.id),gpu=Array.from(matrices.subarray(i*16,i*16+16)),expected=Array.from(record.preparedMatrices.subarray(preparedIndex*16,preparedIndex*16+16));
     const matrixExact=preparedIndex>=0&&gpu.every((v,j)=>v===expected[j]),visibilityExact=visibility[i]===mesh.geometry.attributes.nativeVisibility.getX(i)&&visibility[i]>0,identityExact=!!logical&&standbyTreeKey(logical)===d.key&&record.isPrepared(d.id);
     report.instances++;report.matrixExact+=Number(matrixExact);report.visibilityExact+=Number(visibilityExact);report.identityExact+=Number(identityExact);
     rows.push({id:d.id,key:d.key,level:record.level,drawIndex:i,preparedIndex,matrixExact,visibilityExact,identityExact,gpu,expected,gpuVisibility:visibility[i]});
    }
    report.draws.push({slot:adapter.layer.options.slot,level:record.level,count:mesh.count,matrixVersion:mesh.instanceMatrix.version,visibilityVersion:mesh.geometry.attributes.nativeVisibility.version,shader:{materialType:(args[4]??mesh.material).type,materialName:(args[4]??mesh.material).name,materialUuid:(args[4]??mesh.material).uuid,uniforms:readStandbyProgramUniforms(gl,program)},rows});
   }catch(error){report.errors.push(String(error));}
  };restore.push(()=>mesh.onAfterRender=previous);
 }
 try{world.render(0);}catch(error){report.errors.push(String(error));}finally{for(const fn of restore)fn();}
 report.webglError=gl.getError();report.passed=report.instances>0&&!report.errors.length&&!report.webglError&&report.matrixExact===report.instances&&report.visibilityExact===report.instances&&report.identityExact===report.instances;return report;
}

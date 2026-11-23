import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// Compile the exact production C++ function, not a JS geometry analogue.
// Usage: node tools/experiments/check-native-circle-range.mjs [source] [output-dir]
// Set CXX_PYTHON and CXX_EMSCRIPTEN to the existing SDK's python/em++.py.
const source=resolve(process.argv[2]??'src/world/wild-engine/spatial-gate-route-ranges.inc');
const output=resolve(process.argv[3]??'.cache/native-circle-control');mkdirSync(output,{recursive:true});
const text=readFileSync(source,'utf8').replaceAll('\r\n','\n');
const start=text.indexOf('int gateCircleRange('),end=text.indexOf('\nint spatialNativeGateCircleRange(',start);
if(start<0||end<0)throw Error('Production circle function boundaries missing');
const code=`#include <algorithm>
#include <cmath>
#include <cstdio>
#include <limits>
${text.slice(start,end)}
int main(){
 int failures=0,checks=0;
 const auto check=[&](const char* name,double ax,double az,double bx,double bz,double x,double z,double radius,int expected,bool strict){
  double range[2]={-77,-88};const int actual=gateCircleRange(ax,az,bx,bz,x,z,radius,range,strict);++checks;
  if(actual!=expected||(actual!=1&&(range[0]!=-77||range[1]!=-88))){++failures;std::printf("FAIL %s strict=%d actual=%d expected=%d\\n",name,strict,actual,expected);}
 };
 for(bool strict:{false,true}){
  // The real Farm detour: its supporting line is tangent, but roots lie far beyond either endpoint.
  check("farm-detour-forward",-16,11,-16,10,-14,3.2,2,0,strict);
  check("farm-detour-reverse",-16,10,-16,11,-14,3.2,2,0,strict);
  check("before-start",0,0,1,0,-4,2,2,0,strict);
  check("after-end",0,0,1,0,5,2,2,0,strict);
  check("before-start-near-tangent",0,0,1,0,-4,2+1e-10,2,0,strict);
  check("after-end-near-tangent",0,0,1,0,5,2-1e-10,2,0,strict);
  check("interior-tangent",0,0,1,0,.5,2,2,-1,strict);
  check("start-tangent",0,0,1,0,0,2,2,-1,strict);
  check("end-tangent",0,0,1,0,1,2,2,-1,strict);
  check("interior-near-tangent",0,0,1,0,.5,2-1e-10,2,-1,strict);
  check("conservative-axial-margin",0,0,1,0,-2-1e-10,2,2,-1,strict);
  check("crossing",-4,0,4,0,0,0,2,1,strict);
  check("contained",-.5,0,.5,0,0,0,2,1,strict);
  check("separated-line",-4,0,4,0,0,3,2,0,strict);
  check("zero-length-boundary",2,0,2,0,0,0,2,-1,strict);
  check("zero-length-inside",0,0,0,0,0,0,2,1,strict);
  check("zero-length-outside",3,0,3,0,0,0,2,0,strict);
  check("invalid-radius",0,0,1,0,0,0,0,-1,strict);
  check("infinite-radius",0,0,1,0,0,0,std::numeric_limits<double>::infinity(),-1,strict);
  check("invalid-length",0,0,std::numeric_limits<double>::infinity(),0,0,0,2,-1,strict);
  double range[2]={-1,-1};++checks;
  if(gateCircleRange(-4,0,4,0,0,0,2,range,strict)!=1||range[0]!=.25||range[1]!=.75){++failures;std::puts("FAIL clipped crossing roots");}
 }
 std::printf("circle controls: %d checks, %d failures\\n",checks,failures);return failures?1:0;
}
`;
const input=resolve(output,'control.cpp'),binary=resolve(output,'control.cjs');writeFileSync(input,code);
const python=process.env.CXX_PYTHON,compiler=process.env.CXX_EMSCRIPTEN;
if(!python||!compiler)throw Error('Set CXX_PYTHON and CXX_EMSCRIPTEN to the existing SDK; no dependency is installed');
const build=spawnSync(python,[compiler,input,'-std=c++17','-O2','-sSINGLE_FILE=1','-sENVIRONMENT=node','-o',binary],{encoding:'utf8'});
if(build.error)throw build.error;
if(build.status!==0){process.stdout.write(build.stdout??'');process.stderr.write(build.stderr??'');process.exit(build.status??1);}
const run=spawnSync(process.execPath,[binary],{encoding:'utf8'});if(run.error)throw run.error;
const receipt={source,sourceSha256:createHash('sha256').update(text).digest('hex'),functionSha256:createHash('sha256').update(text.slice(start,end)).digest('hex'),node:process.version,compiler,exitCode:run.status,stdout:run.stdout,stderr:run.stderr,scope:'Exact production C++ function compiled to WASM; no GPU or full runtime certification'};
writeFileSync(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));process.exitCode=run.status??1;

from pathlib import Path
import os,re,json,hashlib,subprocess,shutil,sys,time
n='native-settled-idle';root=Path.cwd()
read=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(p,v):Path(p).write_bytes((json.dumps(v,indent=2)+'\n').encode())
b=read(f'.cache/{n}-baseline.json');owned=set(b['ownedBefore'])
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==b['baseCommit']
assert not subprocess.check_output(['git','diff','--cached','--name-only'])
for k in ['testedInputs','runtimeSources','nativeBuiltInputs','preservedFiles','externalCommittedInputs']:
 for p,h in b[k].items():
  if p not in owned:assert sha(p)==h,p
outputs=['src/world/wild-engine/spatial-savanna.wasm','public/wild-engine/spatial-threaded.mjs','public/wild-engine/spatial-threaded.wasm']
sources={p:sha(p) for p in b['nativeBuiltInputs'] if p not in outputs};assert len(sources)==61
protected={p:sha(p) for k in ['preservedFiles','externalCommittedInputs'] for p in b[k]}
script=Path('tools/build-spatial-savanna-wasm.sh').read_text();exports=re.search(r"-s 'EXPORTED_FUNCTIONS=(\[.*?\])'",script).group(1);api=re.search(r"-s '(INCOMING_MODULE_JS_API=\[.*?\])'",script).group(1)
exportPath=root/f'.cache/{n}-exports.json';exportPath.write_text(exports);out=root/f'.cache/{n}-native-output-corrected';assert not out.exists();(out/'standalone').mkdir(parents=True);(out/'pthread').mkdir()
env=os.environ.copy();env['EM_CONFIG']=str(root/'.cache/emsdk/.emscripten');env['EMSDK_PYTHON']=sys.executable;env['PATH']=str(root/'.cache/emsdk/node/24.19.0_64bit')+os.pathsep+env['PATH']
cpp=['spatial-savanna.cpp','lazy-sectors.cpp','spatial-route-planner.cpp','spatial-action-planner.cpp','spatial-intent-state.cpp','spatial-dynamic-bodies.cpp'];assert all(('src/world/wild-engine/'+p) in script for p in cpp)
base=[str(root/'.cache/emsdk/upstream/emscripten/em++.bat'),*[str(root/'src/world/wild-engine'/p) for p in cpp],'-std=c++17','-O3','-s','ALLOW_MEMORY_GROWTH=1','-s','INITIAL_MEMORY=16777216','-s','EXPORTED_FUNCTIONS=@'+str(exportPath),'--no-entry'];commands=[]
for label,flags,target in [('standalone',['-s','STANDALONE_WASM=1'],out/'standalone/spatial-savanna.wasm'),('pthread',['-pthread','-s','MODULARIZE=1','-s','EXPORT_ES6=1','-s','PTHREAD_POOL_SIZE=1','-s','ALLOW_BLOCKING_ON_MAIN_THREAD=0','-s','EXIT_RUNTIME=0','-s',api,'-s','MAXIMUM_MEMORY=536870912','-s','EXPORTED_RUNTIME_METHODS=["HEAPU8","PThread"]'],out/'pthread/spatial-threaded.mjs')]:
 command=[*base,*flags,'-o',str(target)];start=time.monotonic();print('Canonical '+label+' build started (isolated output)',flush=True);subprocess.run(command,env=env,check=True);commands.append({'label':label,'command':command,'exitCode':0,'elapsedSeconds':time.monotonic()-start});print(label+' built',flush=True)
assert all(sha(p)==h for m in [sources,protected] for p,h in m.items())
assert {p.name for p in (out/'pthread').iterdir()}=={'spatial-threaded.mjs','spatial-threaded.wasm','spatial-threaded.worker.mjs'}
assert (out/'pthread/spatial-threaded.worker.mjs').read_bytes()==Path('public/wild-engine/spatial-threaded.worker.mjs').read_bytes()
assert all(sha(p)==b['nativeBuiltInputs'][p] for p in outputs)
for source,target in zip([out/'standalone/spatial-savanna.wasm',out/'pthread/spatial-threaded.mjs',out/'pthread/spatial-threaded.wasm'],outputs):shutil.copyfile(source,target)
write(f'.cache/{n}-native-build-record.json',{'canonicalScript':'tools/build-spatial-savanna-wasm.sh','commands':commands,'outputs':{p:sha(p) for p in outputs},'nativeSourceInputs':sources,'protectedFiles':protected,'pthreadWorkerUnchanged':True})
write(f'.cache/{n}-built-hashes.json',{p:sha(p) for p in b['nativeBuiltInputs']})
print('Installed owned canonical native outputs, worker and protected bytes unchanged.',flush=True)

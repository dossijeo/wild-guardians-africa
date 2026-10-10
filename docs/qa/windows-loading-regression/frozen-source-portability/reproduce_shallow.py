from pathlib import Path
import subprocess,tempfile,json,os,hashlib
root=Path(__file__).resolve().parents[4];task=Path(tempfile.mkdtemp(prefix='loading-shallow-',dir=root/'.cache'));proxy=task/'proxy.git';checkout=task/'checkout';commands=[]
def run(args,cwd=root,check=True):
 result=subprocess.run(args,cwd=cwd,capture_output=True,text=True,encoding='utf8');commands.append({'argv':args,'cwd':str(cwd),'exitCode':result.returncode})
 if check and result.returncode:raise RuntimeError(result.stdout+result.stderr)
 return result
run(['git','clone','--shared','--bare',str(root),str(proxy)])
run(['git','config','uploadpack.allowFilter','true'],proxy)
run(['git','clone','--depth','1','--filter=blob:none','--no-checkout',proxy.as_uri(),str(checkout)])
run(['git','sparse-checkout','init','--no-cone'],checkout)
run(['git','sparse-checkout','set','--no-cone','/src/','/tools/','/src-tauri/smoke.js','/src-tauri/src/main.rs','/tests/','/content/','/public/content/','/public/menu/native.js','/.github/workflows/windows.yml','/package.json'],checkout)
run(['git','checkout'],checkout)
assert run(['git','rev-parse','--is-shallow-repository'],checkout).stdout.strip()=='true'
assert run(['git','rev-list','--count','HEAD'],checkout).stdout.strip()=='1'
assert run(['git','cat-file','-e','0e94d7be^{commit}'],checkout,False).returncode!=0
# Junction shares installed dependencies only; no asset/history fetch through npm.
env=os.environ.copy();env['QA_SHALLOW_LINK']=str(checkout/'node_modules');env['QA_SHALLOW_MODULES']=str(root/'node_modules')
link=subprocess.run(['powershell','-NoProfile','-Command','New-Item -ItemType Junction -Path $env:QA_SHALLOW_LINK -Target $env:QA_SHALLOW_MODULES | Out-Null'],env=env,capture_output=True,text=True);assert link.returncode==0,link.stderr
pattern='App retains|only fixture flow|App trace wiring|only exact trace hunks|wiring outside|GPU warm|frozen source'
files=['tests/crop-partition-app.test.js','tests/desktop-smoke-fixture-menu.test.js','tests/native-loading-trace-bridge.test.js','tests/world-crop-pair.test.js','tests/world-crop-pair-wiring.test.js','tests/frozen-loading-source.test.js']
result=run(['node','--test','--test-name-pattern='+pattern,*files],checkout,False);raw=(result.stdout+result.stderr).encode();(task/'original-tests.log').write_bytes(raw)
receipt={'source':run(['git','rev-parse','HEAD'],checkout).stdout.strip(),'checkout':str(checkout),'shallow':True,'commitCount':1,'historicalRefAbsent':True,'commands':commands,'testExitCode':result.returncode,'logSha256':hashlib.sha256(raw).hexdigest(),'scope':'Actual depth1 partial Git checkout; source invariant tests only, no asset payload parsing or native execution.'};(task/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8')
print(json.dumps({'receipt':str(task/'receipt.json'),'exitCode':result.returncode}));print(result.stdout[-400:]);assert result.returncode==0

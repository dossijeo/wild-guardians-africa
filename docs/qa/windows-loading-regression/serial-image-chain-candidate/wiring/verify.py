import pathlib,json,hashlib,subprocess
here=pathlib.Path(__file__).resolve().parent
root=here.parents[4]
r=json.loads((here/'receipt.json').read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
for group in ['changed','unchanged']:
 for p,digest in r[group].items():assert sha((root/p).read_bytes())==digest,p
for p,digest in r['unchanged'].items():assert sha(subprocess.check_output(['git','show',r['baseline']+':'+p],cwd=root))==digest,p
for name,digest in r['logs'].items():assert sha((here/name).read_bytes())==digest,name
for check in r['checks']:assert check['exitCode']==0 and sha((here/check['log']).read_bytes())==check['sha256']
for p in r['syntaxFiles']:subprocess.run(['node','--check',p],cwd=root,check=True)
assert not r['defaultEnabled'] and not r['nativeEvidence']
assert r['requiredTrialInputs']=={'serial_image_chain':True,'wall_buffer_package':False,'compile_window':False,'resource_overlap':False}
smoke=(root/'src-tauri/smoke.js').read_text(encoding='utf-8')
assert 'worldEnd = worldStartedAt + 90000' in smoke and 'await wait(300000)' in smoke
assert 'WaitForExit(900000)' in (root/'.github/workflows/windows.yml').read_text(encoding='utf-8')
print('PASS: exact source/log hashes, unchanged prepare/loaders/compiler/budget, smoke-only OFF defaults, original gates, CPU-only scope')

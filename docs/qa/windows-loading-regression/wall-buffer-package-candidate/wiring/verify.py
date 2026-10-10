import pathlib,json,hashlib,subprocess
here=pathlib.Path(__file__).resolve().parent
root=here.parents[4]
r=json.loads((here/'receipt.json').read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
for group in ['changed','unchanged']:
 for p,digest in r[group].items():assert sha((root/p).read_bytes())==digest,p
for p,digest in r['unchanged'].items():assert sha(subprocess.check_output(['git','show',r['baseline']+':'+p],cwd=root))==digest,p
for check in r['checks']:
 assert check['exitCode']==0
 assert sha((here/check['log']).read_bytes())==check['sha256']
assert not r['defaultEnabled'] and not r['dispatchExecuted']
assert r['futureInputs']=={'wall_buffer_package':True,'compile_window':False,'resource_overlap':False}
print('PASS: exact wiring/source/log hashes, reviewed loader unchanged, defaultOFF/no dispatch')

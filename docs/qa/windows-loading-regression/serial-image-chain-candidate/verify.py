import pathlib,json,hashlib,subprocess
here=pathlib.Path(__file__).resolve().parent
root=here.parents[3]
r=json.loads((here/'receipt.json').read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
for group in ['changed','unchanged']:
 for p,digest in r[group].items():assert sha((root/p).read_bytes())==digest,p
for p,digest in r['unchanged'].items():assert sha(subprocess.check_output(['git','show',r['baseline']+':'+p],cwd=root))==digest,p
for name,digest in r['logs'].items():assert sha((here/name).read_bytes())==digest,name
for check in r['checks']:assert check['exitCode']==0
new=(root/'src/rendering/loading-diorama.js').read_text(encoding='utf-8')
old=subprocess.check_output(['git','show',r['baseline']+':src/rendering/loading-diorama.js'],cwd=root).decode('utf-8')
tail=lambda s:s[s.index('    const layout=mountains.arcLayout'):]
off=lambda s:s[s.index("    }else{\n      await phase('diorama-prepare-sky'"):s.index('    // Shared assets remain owned by World')]
assert off(old)==off(new) and tail(old)==tail(new)
assert sha(off(new).encode())==r['normalOffBranchSha256']
assert sha(tail(new).encode())==r['gpuTailSha256']
assert not r['defaultEnabled'] and not r['cliWired'] and not r['nativeEvidence']
print('PASS: source/log hashes, identical OFF/GPU tail, unchanged loaders/gates/CLI and CPU-only scope')

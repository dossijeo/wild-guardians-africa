import pathlib,json,hashlib,gzip,subprocess
root=pathlib.Path(__file__).resolve().parents[4]
here=pathlib.Path(__file__).resolve().parent
receipt=json.loads((here/'receipt.json').read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
for path,row in receipt['runtimeSources'].items():
 raw=(root/path).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],path
for path,row in receipt['logs'].items():
 raw=(here/path).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256'],path
 original=gzip.decompress(raw);assert len(original)==row['originalBytes'] and sha(original)==row['originalSha256'],path
for path in receipt['unchangedNormalizedSources']:
 assert (root/path).read_bytes().replace(b'\r\n',b'\n')==subprocess.check_output(['git','show','0e94d7be:'+path],cwd=root).replace(b'\r\n',b'\n'),path
package=json.loads((here/'package-diff.json').read_text(encoding='utf-8'))
assert sum(x['bytes'] for x in package['added'])-sum(x['bytes'] for x in package['removed'])+sum(x['delta'] for x in package['changed'])==package['deltaBytes']==19787
assert receipt['tests']['pass']==173 and receipt['tests']['fail']==0
assert receipt['sfx']['semanticEqual'] and receipt['sfx']['rows']==126
print('PASS source hashes, original/gzip log bytes, retained main sources, package delta, 173 tests receipt')

"""Prepare an isolated native visual invocation. Execution needs --execute.
No browser driver, window resizing, timeout extension or global env mutation.
"""
import argparse,hashlib,json,os,pathlib,subprocess,uuid

def sha_file(path):
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):digest.update(chunk)
    return digest.hexdigest()

def prepare(exe,expected_sha,source,fixture,output,plant=False):
    exe=pathlib.Path(exe).resolve();fixture=pathlib.Path(fixture).resolve();output=pathlib.Path(output).resolve()
    if sha_file(exe)!=expected_sha:raise ValueError('Executable SHA does not match official artifact receipt')
    record=json.loads(fixture.read_text(encoding='utf-8'))
    if not isinstance(record.get('slotId'),str) or not isinstance(record.get('snapshot'),str):raise ValueError('Invalid owned fixture')
    session=output/('visual-'+str(uuid.uuid4()));session.mkdir(parents=True,exist_ok=False)
    profile=session/'webview-profile';profile.mkdir(exist_ok=False)
    report=session/'desktop-visual.json'
    args=[str(exe),'--smoke-report',str(report),'--smoke-fixture',str(fixture),'--smoke-visual']
    if plant:args.append('--smoke-visual-plant')
    plan={'source':source,'executable':str(exe),'executableSha256':expected_sha,'fixture':str(fixture),'fixtureSha256':sha_file(fixture),
          'snapshotSha256':hashlib.sha256(record['snapshot'].encode()).hexdigest(),'slotId':record['slotId'],'argv':args,
          'WEBVIEW2_USER_DATA_FOLDER':str(profile),'report':str(report),'executed':False,'processGateMs':900000,
          'scope':'Native visual readbacks with diagnostic overhead; synthetic engine handler if requested, never physical input. No portrait resize route or timing claim.'}
    receipt=session/'launch-receipt.json';receipt.write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
    return plan,receipt

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--exe',required=True);parser.add_argument('--exe-sha256',required=True)
    parser.add_argument('--source',required=True);parser.add_argument('--fixture',required=True);parser.add_argument('--output',required=True)
    parser.add_argument('--plant',action='store_true');parser.add_argument('--execute',action='store_true')
    options=parser.parse_args();plan,receipt=prepare(options.exe,options.exe_sha256,options.source,options.fixture,options.output,options.plant)
    if options.execute:
        environment=os.environ.copy();environment['WEBVIEW2_USER_DATA_FOLDER']=plan['WEBVIEW2_USER_DATA_FOLDER']
        # Same 900000ms process gate as the original fixture workflow; never
        # replaces the independent 90s world gate or 300000ms hidden interval.
        plan['executed']=True
        try:
            result=subprocess.run(plan['argv'],env=environment,timeout=900,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            plan['processExitCode']=result.returncode
        except subprocess.TimeoutExpired:
            plan['processGateFailed']=True
            raise
        finally:
            receipt.write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
    print(str(receipt))

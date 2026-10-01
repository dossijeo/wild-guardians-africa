"""Preload large existing Git blobs using a temporary transfer branch.

Uses a separate index; never rewrites main, its commits, or the working tree.
Retry resumes from the existing transfer branch. Main remains authoritative.
"""
import subprocess,pathlib,os,tempfile
root=pathlib.Path(__file__).resolve().parents[1]
branch='codex/asset-transfer'
def git(*args,input=None,env=None):
    return subprocess.run(['git',*args],cwd=root,input=input,text=True,env=env,check=True,capture_output=True).stdout.strip()
remote=git('ls-remote','origin','refs/heads/'+branch)
if remote:
    git('fetch','origin',branch)
    parent=git('rev-parse','FETCH_HEAD')
else:parent=git('rev-parse','7b0501f')
present={line.split('\t',1)[1] for line in git('ls-tree','-r',parent,'public/assets').splitlines()}
rows=[]
for line in git('ls-tree','-r','--long','HEAD','public/assets').splitlines():
    metadata,path=line.split('\t',1);mode,kind,oid,size=metadata.split()
    if path not in present:rows.append((mode,oid,int(size),path))
batches=[];batch=[];size=0
for row in rows:
    if batch and size+row[2]>8*1024*1024:batches.append(batch);batch=[];size=0
    batch.append(row);size+=row[2]
if batch:batches.append(batch)
with tempfile.TemporaryDirectory(prefix='wg-transfer-') as temporary:
    env={**os.environ,'GIT_INDEX_FILE':str(pathlib.Path(temporary)/'index')}
    git('read-tree',parent,env=env)
    for index,batch in enumerate(batches,1):
        git('update-index','--index-info',input=''.join(f'{mode} {oid}\t{path}\n' for mode,oid,size,path in batch),env=env)
        tree=git('write-tree',env=env)
        commit=git('commit-tree',tree,'-p',parent,input=f'chore(assets): preload {len(batch)} original resources for transfer\n')
        git('update-ref','refs/heads/'+branch,commit)
        print(f'Uploading batch {index}/{len(batches)} ({sum(r[2] for r in batch)/1024/1024:.1f} MiB)',flush=True)
        subprocess.run(['git','-c','http.version=HTTP/1.1','-c','http.postBuffer=62914560','push','origin',branch],cwd=root,check=True,timeout=150)
        parent=commit
        print(f'Confirmed batch {index}/{len(batches)}',flush=True)
print('Original blobs preloaded; main can now push without one giant payload.',flush=True)

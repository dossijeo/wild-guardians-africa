"""Fetch a checksum-verified portable Blender into this worktree's ignored cache."""
import hashlib, pathlib, urllib.request, zipfile
root=pathlib.Path(__file__).resolve().parents[1]
cache=root/'.cache/frontside-model-pilot/tools'; cache.mkdir(parents=True,exist_ok=True)
base='https://download.blender.org/release/Blender4.5/'
name='blender-4.5.9-windows-x64.zip'
def request(url): return urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
checks=urllib.request.urlopen(request(base+'blender-4.5.9.sha256'),timeout=30).read().decode()
expected=next(line.split()[0] for line in checks.splitlines() if name in line)
target=cache/name
if not target.exists():
    with urllib.request.urlopen(request(base+name),timeout=60) as response,target.open('wb') as stream:
        while chunk:=response.read(4*1024*1024): stream.write(chunk)
actual=hashlib.file_digest(target.open('rb'),'sha256').hexdigest()
assert actual==expected,(actual,expected)
destination=cache/name.removesuffix('.zip')
if not destination.exists():
    with zipfile.ZipFile(target) as archive:
        for member in archive.infolist():
            final=(cache/member.filename).resolve()
            assert final.is_relative_to(cache.resolve()),'Unexpected archive path'
        archive.extractall(cache)
print(destination/'blender.exe',actual)

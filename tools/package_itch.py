"""Reproducible itch.io archive: index.html at ZIP root, stable order/timestamps."""
import pathlib,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
dist=root/'dist'
assert (dist/'index.html').is_file(),'Run npm run build first'
files=sorted(path for path in dist.rglob('*') if path.is_file())
# Official defaults: https://itch.io/docs/creators/html5#zip-file-requirements
assert len(files)<=1000
assert sum(path.stat().st_size for path in files)<=500_000_000
assert all(path.stat().st_size<=200_000_000 and len(path.relative_to(dist).as_posix())<=240 for path in files)
output=root/'test-results/wild-guardians-itch.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for path in files:
        record=zipfile.ZipInfo(path.relative_to(dist).as_posix(),(2026,10,1,0,0,0))
        record.compress_type=zipfile.ZIP_DEFLATED
        record.external_attr=0o100644<<16
        archive.writestr(record,path.read_bytes(),compresslevel=9)
with zipfile.ZipFile(output) as archive:
    assert 'index.html' in archive.namelist()
    assert archive.testzip() is None
print(f'{output}: {output.stat().st_size} bytes; verified CRCs')

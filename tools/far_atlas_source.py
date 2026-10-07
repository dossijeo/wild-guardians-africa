"""Offline source extraction/exact encoding; never writes public assets."""
import hashlib,json,pathlib,sys,zipfile

def digest(data):return hashlib.sha256(data).hexdigest()

if sys.argv[1]=='extract':
    manifest_path,archive_path,destination=map(pathlib.Path,sys.argv[2:5])
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    if digest(archive_path.read_bytes())!=manifest['archiveSha256']:raise ValueError('Atlas source archive hash differs')
    with zipfile.ZipFile(archive_path) as archive:
        if sorted(archive.namelist())!=sorted(manifest['entries']):raise ValueError('Unexpected archive entries')
        inputs={name:archive.read(name) for name in archive.namelist()}
    for name,data in inputs.items():
        if pathlib.PurePosixPath(name).name!=name or digest(data)!=manifest['entries'][name]:raise ValueError('Unsafe or changed atlas input')
    # Every entry is admitted before writing only the caller-owned temporary dir.
    for name,data in inputs.items():(destination/name).write_bytes(data)
elif sys.argv[1]=='repack':
    # Reproduce the source container without an untracked extraction directory.
    with zipfile.ZipFile(sys.argv[2]) as archive:inputs={name:archive.read(name) for name in archive.namelist()}
    with zipfile.ZipFile(sys.argv[3],'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in sorted(inputs.items()):
            info=zipfile.ZipInfo(name,(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,data,compresslevel=9)
elif sys.argv[1]=='encode':
    import PIL
    from PIL import Image,features
    if PIL.__version__!='9.5.0' or features.version('webp')!='1.3.0':raise ValueError('Requires Pillow 9.5.0 / libwebp 1.3.0')
    Image.open(sys.argv[2]).convert('RGBA').save(sys.argv[3],format='WEBP',lossless=True,method=6,exact=True)
else:raise ValueError('Expected extract, repack or encode')

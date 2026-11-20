import sys,time,hashlib
from pathlib import Path
exec(Path('.cache/native-60hz-display-modes.py').read_text(encoding='utf-8-sig').split('rows=[]')[0])
u.ChangeDisplaySettingsExW.argtypes=[W.LPCWSTR,C.POINTER(Mode),W.HWND,W.DWORD,C.c_void_p];u.ChangeDisplaySettingsExW.restype=W.LONG
name=r'\\.\DISPLAY1';saved=Path('.cache/native-60hz-original-mode.bin');current=Mode();current.size=C.sizeof(current)
assert u.EnumDisplaySettingsW(name,0xffffffff,C.byref(current))
before={k:getattr(current,k) for k in ['width','height','hz','bpp','x','y']}
if sys.argv[1]=='apply':
 assert not saved.exists() or saved.read_bytes()==bytes(current),'Current mode differs from the saved original'
 assert (current.width,current.height,current.hz)==(3840,2160,30)
 target=None
 for i in range(3000):
  m=Mode();m.size=C.sizeof(m)
  if not u.EnumDisplaySettingsW(name,i,C.byref(m)):break
  if (m.width,m.height,m.hz,m.bpp,m.displayFlags)==(current.width,current.height,60,current.bpp,0):target=m;break
 assert target is not None,'No exact progressive 4K60 mode'
 target.x=current.x;target.y=current.y
 if not saved.exists():saved.write_bytes(bytes(current))
elif sys.argv[1]=='restore':
 target=Mode.from_buffer_copy(saved.read_bytes())
else:raise ValueError('apply or restore')
tested=u.ChangeDisplaySettingsExW(name,C.byref(target),None,2,None);assert tested==0,('CDS_TEST',tested)
changed=u.ChangeDisplaySettingsExW(name,C.byref(target),None,0,None);assert changed==0,('apply',changed)
observed=Mode();observed.size=C.sizeof(observed);assert u.EnumDisplaySettingsW(name,0xffffffff,C.byref(observed))
after={k:getattr(observed,k) for k in ['width','height','hz','bpp','x','y']}
r={'atUnixMs':time.time()*1000,'action':sys.argv[1],'device':name,'before':before,'after':after,'testResult':tested,'changeResult':changed,'registryPersisted':False,'savedOriginalSha256':hashlib.sha256(saved.read_bytes()).hexdigest()}
Path('.cache/native-60hz-'+((sys.argv[2]+'-') if len(sys.argv)>2 else '')+sys.argv[1]+'-receipt.json').write_text(json.dumps(r,indent=2));print(json.dumps(r));assert after['hz']==target.hz

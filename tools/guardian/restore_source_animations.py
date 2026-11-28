"""Restore original uncompressed GLB animation channels by unique node name.
Use after geometry-only Blender edits; refuses missing or ambiguous targets.
"""
import argparse,copy,json,struct
from pathlib import Path

def read(path):
 b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),bytearray(b[28+n:])
def restore(source,target):
 src,sbin=read(source);dst,dbin=read(target)
 lookup={}
 for i,node in enumerate(dst['nodes']):lookup.setdefault(node.get('name'),[]).append(i)
 accessors={};views={}
 def view(index):
  if index not in views:
   v=copy.deepcopy(src['bufferViews'][index]);assert v.get('buffer',0)==0 and not v.get('extensions'),'Compressed source unsupported'
   start=v.get('byteOffset',0);data=sbin[start:start+v['byteLength']];dbin.extend(b'\0'*((-len(dbin))%4));v['byteOffset']=len(dbin);dbin.extend(data);views[index]=len(dst['bufferViews']);dst['bufferViews'].append(v)
  return views[index]
 def accessor(index):
  if index not in accessors:
   a=copy.deepcopy(src['accessors'][index]);assert 'sparse' not in a,'Sparse source unsupported';a['bufferView']=view(a['bufferView']);accessors[index]=len(dst['accessors']);dst['accessors'].append(a)
  return accessors[index]
 clips=copy.deepcopy(src.get('animations',[]))
 for clip in clips:
  for channel in clip['channels']:
   name=src['nodes'][channel['target']['node']].get('name');matches=lookup.get(name,[])
   if len(matches)!=1:raise ValueError('Missing/ambiguous animation node '+str(name))
   channel['target']['node']=matches[0]
  for sampler in clip['samplers']:
   sampler['input']=accessor(sampler['input']);sampler['output']=accessor(sampler['output'])
 dst['animations']=clips;dst['buffers'][0]['byteLength']=len(dbin);j=json.dumps(dst,separators=(',',':')).encode();j+=b' '*((-len(j))%4);dbin.extend(b'\0'*((-len(dbin))%4))
 out=struct.pack('<III',0x46546c67,2,28+len(j)+len(dbin))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(dbin),0x004e4942)+dbin
 Path(target).write_bytes(out)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('target');a=p.parse_args();restore(a.source,a.target)

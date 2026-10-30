"""Run in Blender to exercise geometric and alpha-cutout bake correctness."""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from vertex_visibility import bake_visibility
vertices=np.array([[0,0,0],[-1,-1,.05],[1,-1,.05],[1,1,.05],[-1,1,.05]],dtype=np.float32)
normals=np.tile([0,0,1.],(5,1))
triangles=np.array([[1,2,3],[1,3,4]])
uv=np.full((5,2),.25)
opaque,radius,stats=bake_visibility(vertices,normals,triangles)
transparent,_,_=bake_visibility(vertices,normals,triangles,uv,np.zeros((2,2)))
assert opaque[0] < 32, opaque
assert transparent[0] == 255, transparent
# Native texture rows supplied top-down, no wrapping: negative UV clamps to 0.
uv[:]=[-.25,.25]
alpha=np.array([[0.,1.],[1.,1.]])
clamped,_,_=bake_visibility(vertices,normals,triangles,uv,alpha)
assert clamped[0]==255, clamped
uv[:]=[.75,.25]
solid,_,_=bake_visibility(vertices,normals,triangles,uv,alpha)
assert solid[0]==opaque[0], (solid,opaque)
repeat,_,_=bake_visibility(vertices,normals,triangles)
assert np.array_equal(repeat,opaque)
assert stats['invalidNormals']==0 and stats['traversalLimit']==0
print('VERTEX_VISIBILITY_TESTS_PASS',opaque.tolist(),transparent.tolist(),flush=True)

# A nearby surface on another dominant joint must not leave a baked pose shadow.
groups=np.array([0,1,1,1,1])
isolated,_,_=bake_visibility(vertices,normals,triangles,groups=groups)
assert isolated[0]==255, isolated
same_joint,_,_=bake_visibility(vertices,normals,triangles,groups=np.zeros(5,dtype=int))
assert np.array_equal(same_joint,opaque), (same_joint,opaque)
# Coincident receivers with different joints must not share the visibility cache.
paired=np.concatenate([vertices,vertices[:1]])
paired_normals=np.concatenate([normals,normals[:1]])
paired_groups=np.array([0,1,1,1,1,1])
paired_visibility,_,_=bake_visibility(paired,paired_normals,triangles,groups=paired_groups)
assert paired_visibility[0]==255 and paired_visibility[-1]<32, paired_visibility
print('JOINT_VISIBILITY_TESTS_PASS',flush=True)

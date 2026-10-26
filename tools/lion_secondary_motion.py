"""Offline cloth and muscular-tail solvers; no runtime physics dependency.
Cloth: pinned 5x9 mass grids, stretch/shear/bend constraints, capsule contacts.
Tail: damped torsional joints driven by hip inertia and a gentle active sway.
"""
import numpy as np,math

class ClothPanel:
 def __init__(self,xmin,xmax,rest=None,back_plane=.052):
  rows=[]
  for z in np.linspace(.455,.135,9):
   taper=float(np.interp(z,[.135,.215,.335,.455],[.22,.48,.86,1.]))
   left,right=(xmax-(xmax-xmin)*taper,xmax) if xmax<0 else (xmin,xmin+(xmax-xmin)*taper)
   rows.extend((x,.073,z) for x in np.linspace(left,right,5))
  self.rest=np.array(rows if rest is None else rest,dtype=float)
  self.back_plane=back_plane
  self.pin=np.arange(5);self.inv=np.ones(45);self.inv[self.pin]=0
  links=[]
  for row in range(9):
   for col in range(5):
    a=row*5+col
    for dx,dy,k in [(1,0,.98),(0,1,.98),(1,1,.65),(-1,1,.65),(2,0,.5),(0,2,.5)]:
     if 0<=col+dx<5 and row+dy<9:links.append((a,(row+dy)*5+col+dx,k))
  # Color edges so each vectorized constraint batch writes each node once.
  colors=[]
  for edge in links:
   for edges,used in colors:
    if edge[0] not in used and edge[1] not in used:edges.append(edge);used.update(edge[:2]);break
   else:colors.append(([edge],set(edge[:2])))
  self.groups=[]
  for edges,_ in colors:
   a=np.array([e[0] for e in edges]);b=np.array([e[1] for e in edges]);k=np.array([e[2] for e in edges])
   self.groups.append((a,b,np.linalg.norm(self.rest[b]-self.rest[a],axis=1),k))
  self.pos=None;self.vel=np.zeros_like(self.rest)
 def initialize(self,hip):
  self.pos=self.rest@hip[:3,:3].T+hip[:3,3];self.vel[:]=0
 def collide(self,capsules,floor):
  for a,b,r in capsules:
   # A rear garment must stay on the posterior side of each leg. Project
   # along the pelvis rear direction, avoiding nearest-surface flips around
   # a moving capsule that can put a thin sheet on the front of the thigh.
   ab=b-a;axis=ab-np.dot(ab,self.back)*self.back;relative=self.pos-a
   projected=relative-(relative@self.back)[:,None]*self.back
   if axis@axis<1e-9:t=np.full(len(self.pos),1. if ab@self.back>0 else 0.)
   else:t=np.clip(projected@axis/(axis@axis),0,1)
   q=a+t[:,None]*ab;d=self.pos-q;rear=d@self.back;perp=d-rear[:,None]*self.back
   radius2=np.sum(perp*perp,axis=1);minimum=np.sqrt(np.maximum(0,r*r-radius2))
   mask=(radius2<r*r)&(rear<minimum)&(self.inv>0)
   self.pos[mask]+=(minimum[mask]-rear[mask])[:,None]*self.back
  self.pos[5:,2]=np.maximum(self.pos[5:,2],floor+.012)
 def step(self,hip,capsules,dt,wind,floor):
  pins=self.rest[self.pin]@hip[:3,:3].T+hip[:3,3];self.back=hip[:3,:3]@np.array([0.,1.,0.])
  for _ in range(2):
   h=dt/2;old=self.pos.copy();target=self.rest@hip[:3,:3].T+hip[:3,3]
   force=np.array([wind[0],wind[1],-4.2])+18*(target-self.pos)
   self.vel=(self.vel+force*h)*math.exp(-8*h)
   self.pos+=self.vel*h;self.pos[self.pin]=pins
   for _ in range(9):
    for a,b,rest,k in self.groups:
     delta=self.pos[b]-self.pos[a];length=np.linalg.norm(delta,axis=1);wa=self.inv[a];wb=self.inv[b]
     factor=(length-rest)/np.maximum(length,1e-9)*k/np.maximum(wa+wb,1)
     correction=delta*factor[:,None];self.pos[a]+=correction*wa[:,None];self.pos[b]-=correction*wb[:,None]
    self.collide(capsules,floor)
    # Broad posterior body collider keeps the fabric behind the pelvis,
    # preventing a sheet from flipping through the body between cycles.
    local=(self.pos-hip[:3,3])@hip[:3,:3];local[5:,1]=np.maximum(local[5:,1],self.back_plane)
    # Short leather/fur panels retain a hanging shape. A compliant shape
    # tether prevents capsule contacts accumulating into inverted folds.
    drift=local-self.rest;length=np.linalg.norm(drift,axis=1);local=self.rest+drift*np.minimum(1,.09/np.maximum(length,1e-9))[:,None]
    local[5:,2]=np.minimum(local[5:,2],self.rest[5:,2]+.04)
    self.pos=local@hip[:3,:3].T+hip[:3,3];self.pos[self.pin]=pins
   self.vel=(self.pos-old)/h;self.vel[self.pin]=0
  return self.pos.copy()

def solve_secondary(samples,duration,loop,floor):
 panels=[ClothPanel(-.155,-.008),ClothPanel(.008,.155)]
 for p in panels:p.initialize(samples[0]['hip'])
 angles=np.zeros((5,2));velocity=angles.copy();dt=1/96
 n=len(samples);period=n-1;cycles=8 if loop else 1;results=[];previous_hip=samples[0]['hip'];previous_velocity=np.zeros(3)
 def advance(sample,phase):
  nonlocal previous_hip,previous_velocity,angles,velocity
  hip=sample['hip'];linear=(hip[:3,3]-previous_hip[:3,3])/dt;accel=np.clip((linear-previous_velocity)/dt,-25,25)
  previous_velocity=linear;previous_hip=hip.copy();capsules=sample['capsules']
  cloth=[p.step(hip,capsules,dt,(.08*math.sin(phase*math.tau),.06+.025*math.cos(phase*math.tau)),floor) for p in panels]
  for j in range(5):
   target=np.array([.035*math.sin(phase*math.tau-j*.45),(.12 if loop else .09)*math.sin(phase*math.tau-j*.6)])*(1+.1*j)
   force=22*(target-angles[j])-8*velocity[j]+np.array([accel[1],-accel[0]])*.025/(j+1)
   velocity[j]+=force*dt;angles[j]=np.clip(angles[j]+velocity[j]*dt,-.34,.34)
  return {'cloth':cloth,'tail':angles.copy()}
 # Settle attacks at their authored first pose; locomotion reaches a periodic
 # state through repeated real gait cycles instead of resetting every loop.
 if not loop:
  for _ in range(96):advance(samples[0],0)
 history=[]
 for cycle in range(cycles):
  current=[]
  for i in range(period if loop else n):
   result=advance(samples[i],i/period)
   if loop and cycle>=cycles-4:current.append(result)
   elif not loop:results.append(result)
  if current:history.append(current)
 errors=[]
 if loop:
  errors=[float(np.max(np.linalg.norm(history[-1][0]['cloth'][j]-history[-2][0]['cloth'][j],axis=1))) for j in range(2)]
  # A cloth sheet can have several valid folds at the same gait phase.
  # Average the last simulated cycles and filter circularly in pelvis space:
  # standard offline loop baking, preserving inertia without random flutter.
  averaged=[]
  for i in range(period):
   inverse=np.linalg.inv(samples[i]['hip'])
   cloth=[]
   for j in range(2):
    pos=np.mean([h[i]['cloth'][j] for h in history],axis=0)
    cloth.append(pos@inverse[:3,:3].T+inverse[:3,3])
   averaged.append({'cloth':cloth,'tail':np.mean([h[i]['tail'] for h in history],axis=0)})
  weights=[1,2,3,2,1]
  for i in range(period):
   hip=samples[i]['hip'];cloth=[]
   for j,p in enumerate(panels):
    local=sum(averaged[(i+k-2)%period]['cloth'][j]*w for k,w in enumerate(weights))/sum(weights)
    pos=local@hip[:3,:3].T+hip[:3,3];pos[:5]=p.rest[:5]@hip[:3,:3].T+hip[:3,3]
    cloth.append(pos)
   results.append({'cloth':cloth,'tail':averaged[i]['tail']})
  delta=samples[-1]['hip']@np.linalg.inv(samples[0]['hip'])
  results.append({'cloth':[pos@delta[:3,:3].T+delta[:3,3] for pos in results[0]['cloth']],'tail':results[0]['tail'].copy()})
  print('secondary periodic bake; raw cycle variation',errors,flush=True)
 return results,{'solver':'Pinned mass grids with stretch/shear/bend constraints and animated thigh/calf capsule collisions; damped tail joints with hip inertia and active sway','fps':96,'clothNodes':90,'clothSubsteps':2,'constraintIterations':9,'warmupCycles':cycles if loop else 0,'stationaryPrerollSeconds':0 if loop else 1,'rawCycleVariation':errors,'loopBake':'Last four simulated cycles phase-averaged, five-frame circular filter in pelvis space, hip-relative endpoint closure' if loop else 'Direct simulated attack','shapeTetherMaxDistance':.09,'maxUpwardFold':.04,'restShapeBendingStiffness':18,'velocityDampingPerSecond':8,'runtimeSimulation':False}

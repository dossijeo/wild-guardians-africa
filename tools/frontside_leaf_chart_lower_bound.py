"""Exact source chart topology lower bound, no candidate generation.

Disk bounds require checked vertex links, one boundary loop and Euler 1.
They constrain ONLY a design retaining every exact source chart boundary;
they do not establish universal FrontSide or remodelling impossibility.
"""
import hashlib,json,sys
from collections import Counter,defaultdict
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
source=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/source['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==source['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro');prim=doc['meshes'][node['mesh']]['primitives'][0]
p,n,u=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']];ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])

def connected(nodes,adj):
    remaining=set(nodes);groups=[]
    while remaining:
        start=remaining.pop();group={start};pending=[start]
        while pending:
            for v in adj[pending.pop()]:
                if v in remaining:remaining.remove(v);group.add(v);pending.append(v)
        groups.append(group)
    return groups

rows=[]
for label in sorted(set(int(v) for v in labels if v>=2)):
    faces=np.flatnonzero(labels==label);original=np.concatenate([p[ix[faces]],n[ix[faces]],u[ix[faces]]],axis=2).astype(np.float32)
    for domain,lanes in [('POSITION_UV',[0,1,2,6,7]),('POSITION_NORMAL_UV',list(range(8)))]:
        vertices={};triangles=[];edges=defaultdict(list);adj=defaultdict(set)
        for f,tri in enumerate(original):
            ids=[]
            for v in tri:
                key=v[lanes].tobytes()
                if key not in vertices:vertices[key]=len(vertices)
                ids.append(vertices[key])
            triangles.append(ids)
            for a,b in zip(ids,ids[1:]+ids[:1]):edges[tuple(sorted((a,b)))].append(f)
        for owners in edges.values():
            if len(owners)==2:a,b=owners;adj[a].add(b);adj[b].add(a)
        charts=[]
        for component in connected(range(len(triangles)),adj):
            ts=[triangles[f] for f in component];vs={v for t in ts for v in t};es=Counter(tuple(sorted((a,b))) for t in ts for a,b in zip(t,t[1:]+t[:1]))
            bs=[e for e,count in es.items() if count==1];boundary_adj=defaultdict(set)
            for a,b in bs:boundary_adj[a].add(b);boundary_adj[b].add(a)
            loops=connected(boundary_adj,boundary_adj) if boundary_adj else []
            links=defaultdict(list)
            for t in ts:
                for at,v in enumerate(t):links[v].append((t[(at+1)%3],t[(at+2)%3]))
            link_ok=True
            for v,link_edges in links.items():
                link_adj=defaultdict(set);degrees=Counter()
                for a,b in link_edges:link_adj[a].add(b);link_adj[b].add(a);degrees[a]+=1;degrees[b]+=1
                is_boundary=v in boundary_adj
                expected=(sum(d==1 for d in degrees.values())==2 and all(d in [1,2] for d in degrees.values())) if is_boundary else all(d==2 for d in degrees.values())
                if len(connected(link_adj,link_adj))!=1 or not expected:link_ok=False
            euler=len(vs)-len(es)+len(ts)
            disk=euler==1 and len(loops)==1 and all(len(v)==2 for v in boundary_adj.values()) and link_ok and all(v in [1,2] for v in es.values()) and all(len(set(t))==3 for t in ts)
            minimum=max(1,len(bs)-2) if disk else None
            charts.append(dict(sourceFaces=len(ts),vertices=len(vs),edges=len(es),boundaryEdges=len(bs),boundaryVertices=len(boundary_adj),boundaryLoops=len(loops),euler=euler,vertexLinksManifold=link_ok,certifiedDisk=disk,minimumTrianglesKeepingBoundary=minimum,originalFaceIds=faces[sorted(component)].tolist()))
        certified=[c for c in charts if c['certifiedDisk']]
        # Every nonempty unresolved component needs at least one face; do not
        # substitute its original count or call that an established minimum.
        rigorous_lower=sum(c['minimumTrianglesKeepingBoundary'] for c in certified)+len(charts)-len(certified)
        rows.append(dict(label=label,domain=domain,sourceFaces=len(faces),charts=len(charts),certifiedDiskCharts=len(certified),unresolvedCharts=len(charts)-len(certified),conditionalLowerBound=rigorous_lower,chartsDetail=charts))
summaries=[]
for domain in ['POSITION_UV','POSITION_NORMAL_UV']:
    rs=[r for r in rows if r['domain']==domain]
    minimum=sum(r['conditionalLowerBound'] for r in rs);budget=int(len(ix)*1.1)-int(np.sum(labels==0))-2*int(np.sum(labels==1))
    summaries.append(dict(domain=domain,sourceLeafFaces=int(np.sum(labels>=2)),conditionalLeafLowerBound=minimum,leafBudgetWithFullOriginalStemReverses=budget,conditionalBudgetPossible=minimum<=budget,certifiedDiskCharts=sum(r['certifiedDiskCharts'] for r in rs),unresolvedCharts=sum(r['unresolvedCharts'] for r in rs)))
report=dict(status='EXACT_CHART_BOUNDARY_LOWER_BOUND_NOT_APPROVAL',sourceSha256=source['sourceSha256'],summaries=summaries,rows=rows,limitations=['Source exact float32 attribute keys only; no coordinate quantization, source weld or geometry change.', 'Bound applies only if every original chart boundary edge/vertex is retained and disk topology is retained; changing/remapping charts requires a different explicit field reconstruction.', 'Unresolved components contribute only one triangle, a deliberately conservative lower bound; no unverified disk/genus assumption.', 'Normal interpolation, maps, curvature and raster quality can require more triangles than this purely topological bound.', 'No universal FrontSide impossibility, native quality, growth/bridge acceptance or GPU conclusion follows.'])
(folder/'maize-leaf-chart-boundary-lower-bound.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(dict(status=report['status'],summaries=summaries)))

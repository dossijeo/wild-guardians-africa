"""Shared lower-jaw deformation for the original skin and oral lining."""
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)

def lower_weight(point):
    line=1.385+.03*max(0,min(1,(point.y+.65)/.35))
    return (1-smooth(line-.015,line+.04,point.z))*smooth(-.60,-.55,point.y)*(1-smooth(-.34,-.21,point.y))

double gateStaticError(const NativeGate& gate,double scale){
  return 1e-7+256*std::numeric_limits<double>::epsilon()*std::max(1.0,scale)+
    2*gateLeafSpeedBound(gate)*nativeGateMoveSeconds*1e-9;
}
GateSweepAnswer gateSweepStaticPair(IntentState& s,const NativeGate& gate,
    const SpatialStaticMutation& shape,double begin,double end){
  s.gateStaticPairs++;
  const double scale=std::max({std::abs(gate.x),std::abs(gate.z),std::abs(shape.minX),
    std::abs(shape.minZ),std::abs(shape.maxX),std::abs(shape.maxZ)}),error=gateStaticError(gate,scale);
  return gateSweepIntervals(gateMotionKnots(gate),begin,end,
    gateHasMotion(gate)?gateLeafSpeedBound(gate):0,[&](double at){
      const auto leaf=gateCollisionLeaf(gate,at);s.gateStaticEvaluations++;
      return spatialGateShapeDistance(leaf.data(),int(leaf.size()/2),shape)-error;
    });
}
GateSweepAnswer gateSweepLeafPair(IntentState& s,const NativeGate& a,const NativeGate& b,double begin,double end){
  s.gateStaticPairs++;
  const double scale=std::max({std::abs(a.x),std::abs(a.z),std::abs(b.x),std::abs(b.z)}),
    error=gateStaticError(a,scale)+gateStaticError(b,scale),
    speed=(gateHasMotion(a)?gateLeafSpeedBound(a):0)+(gateHasMotion(b)?gateLeafSpeedBound(b):0);
  auto times=gateMotionKnots(a);const auto other=gateMotionKnots(b);times.insert(times.end(),other.begin(),other.end());
  return gateSweepIntervals(std::move(times),begin,end,speed,[&](double at){
    const auto p=gateCollisionLeaf(a,at),q=gateCollisionLeaf(b,at);s.gateStaticEvaluations++;
    return spatialNativePolygonPairDistance(p.data(),int(p.size()/2),q.data(),int(q.size()/2))-error;
  });
}
GateSweepAnswer gateSweepFixedPolygon(IntentState& s,const NativeGate& gate,const std::vector<double>& polygon,double begin,double end){
  s.gateStaticPairs++;const double error=gateStaticError(gate,std::max(std::abs(gate.x),std::abs(gate.z)));
  return gateSweepIntervals(gateMotionKnots(gate),begin,end,gateHasMotion(gate)?gateLeafSpeedBound(gate):0,[&](double at){
    const auto leaf=gateCollisionLeaf(gate,at);s.gateStaticEvaluations++;
    return spatialNativePolygonPairDistance(leaf.data(),int(leaf.size()/2),polygon.data(),int(polygon.size()/2))-error;
  });
}
bool gateFixedPartsClear(IntentState& s,const NativeGate& gate,const SpatialStaticMutation& shape){
  if(!gate.mesh)return true;
  for(int i=0;i<3;i++)if(gate.fullParts[i].size()>=2){const auto polygon=gatePartWorld(gate,gate.fullParts[i],false,s.effectiveTime);
    s.gateStaticPairs++;s.gateStaticEvaluations++;
    if(spatialGateShapeDistance(polygon.data(),int(polygon.size()/2),shape)<=gateStaticError(gate,std::max(std::abs(gate.x),std::abs(gate.z))))return false;
  }return true;
}
void gateStaticWitness(IntentState& s,uint64_t gate,int kind,double id,int gx,int gz,const GateSweepAnswer& answer){
  s.gateStaticResult={double(gate),double(kind),double(id),double(gx),double(gz),answer.from,answer.to,double(answer.reason)};
}
int gateSweepStaticObjects(IntentState& s,const std::map<uint64_t,NativeGate>& gates,bool onlyMechanisms=false){
  for(const auto& [id,gate]:gates){
    if(gate.status==2)continue;
    double area=0;
    for(size_t i=0,j=gate.local.size()-2;i<gate.local.size();j=i,i+=2)
      area+=gate.local[j]*gate.local[i+1]-gate.local[i]*gate.local[j+1];
    if(!std::isfinite(area)||std::abs(area)<1e-12){
      s.gateStaticRejected++;gateStaticWitness(s,id,0,0,0,0,{false,4,s.effectiveTime,s.effectiveTime});return -7;}
    struct Query {IntentState& s;const NativeGate& gate;};Query query{s,gate};
    const auto& b=gate.unsupported;
    const int status=onlyMechanisms&&!gate.mesh?1:spatialVisitGateStaticObjects(b.minX,b.minZ,b.maxX,b.maxZ,
      [](const SpatialGateStaticObject& object,void* opaque){auto& q=*static_cast<Query*>(opaque);
        const auto answer=gateSweepStaticPair(q.s,q.gate,object.shape,q.s.effectiveTime,
          std::max(q.s.effectiveTime,gateMotionEnd(q.gate)));
        if(!answer.clear)gateStaticWitness(q.s,q.gate.id,object.kind,object.id,object.gx,object.gz,answer);
        if(!answer.clear)return false;
        if(!gateFixedPartsClear(q.s,q.gate,object.shape)){gateStaticWitness(q.s,q.gate.id,object.kind,object.id,object.gx,object.gz,{false,1,q.s.effectiveTime,q.s.effectiveTime});return false;}
        return true;
      },&query);
    if(status!=1){
      s.gateStaticRejected++;
      if(status<0)gateStaticWitness(s,id,0,0,0,0,{false,status==-1?3:4,s.effectiveTime,s.effectiveTime});
      return status==-1?-6:status==-2?-7:-8;
    }
    for(auto other=gates.upper_bound(id);other!=gates.end();++other){
      if(other->second.status==2)continue;
      if(onlyMechanisms&&!gate.mesh&&!other->second.mesh)continue;
      const auto& c=other->second.unsupported;
      if(b.maxX+.001<c.minX||b.minX-.001>c.maxX||b.maxZ+.001<c.minZ||b.minZ-.001>c.maxZ)continue;
      const auto answer=gateSweepLeafPair(s,gate,other->second,s.effectiveTime,
        std::max({s.effectiveTime,gateMotionEnd(gate),gateMotionEnd(other->second)}));
      if(!answer.clear){s.gateStaticRejected++;gateStaticWitness(s,id,4,double(other->first),0,0,answer);return -8;}
      for(int side=0;side<2;side++){const auto& fixed=side?gate:other->second;const auto& moving=side?other->second:gate;
        if(!fixed.mesh)continue;
        for(int part=0;part<3;part++)if(fixed.fullParts[part].size()>=2){const auto polygon=gatePartWorld(fixed,fixed.fullParts[part],false,s.effectiveTime);
          const auto contact=gateSweepFixedPolygon(s,moving,polygon,s.effectiveTime,std::max(s.effectiveTime,gateMotionEnd(moving)));
          if(!contact.clear){s.gateStaticRejected++;gateStaticWitness(s,moving.id,4,double(fixed.id),0,0,contact);return -8;}
          if(moving.mesh)for(int own=0;own<3;own++)if(moving.fullParts[own].size()>=2){const auto ownPolygon=gatePartWorld(moving,moving.fullParts[own],false,s.effectiveTime);
            if(spatialNativePolygonPairDistance(polygon.data(),int(polygon.size()/2),ownPolygon.data(),int(ownPolygon.size()/2))<=1e-7){
              s.gateStaticRejected++;gateStaticWitness(s,moving.id,4,double(fixed.id),0,0,{false,1,s.effectiveTime,s.effectiveTime});return -8;}
          }
        }
      }
    }
  }
  return 1;
}

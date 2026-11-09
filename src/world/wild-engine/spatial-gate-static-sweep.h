double gateMotionEnd(const NativeGate& gate){return gate.at+std::abs(gate.target-gate.from)*nativeGateMoveSeconds;}
double gateStaticError(const NativeGate& gate,double scale){
  return 1e-7+256*std::numeric_limits<double>::epsilon()*std::max(1.0,scale)+
    2*gateLeafSpeedBound(gate)*nativeGateMoveSeconds*1e-9;
}
GateSweepAnswer gateSweepStaticPair(IntentState& s,const NativeGate& gate,
    const SpatialStaticMutation& shape,double begin,double end){
  s.gateStaticPairs++;
  const double scale=std::max({std::abs(gate.x),std::abs(gate.z),std::abs(shape.minX),
    std::abs(shape.minZ),std::abs(shape.maxX),std::abs(shape.maxZ)}),error=gateStaticError(gate,scale);
  return gateSweepIntervals(std::vector<double>{gateMotionEnd(gate)},begin,end,
    gate.from==gate.target?0:gateLeafSpeedBound(gate),[&](double at){
      const auto leaf=gateLeaf(gate,gateOpening(gate,at));s.gateStaticEvaluations++;
      return spatialGateShapeDistance(leaf.data(),int(leaf.size()/2),shape)-error;
    });
}
GateSweepAnswer gateSweepLeafPair(IntentState& s,const NativeGate& a,const NativeGate& b,double begin,double end){
  s.gateStaticPairs++;
  const double scale=std::max({std::abs(a.x),std::abs(a.z),std::abs(b.x),std::abs(b.z)}),
    error=gateStaticError(a,scale)+gateStaticError(b,scale),
    speed=(a.from==a.target?0:gateLeafSpeedBound(a))+(b.from==b.target?0:gateLeafSpeedBound(b));
  return gateSweepIntervals(std::vector<double>{gateMotionEnd(a),gateMotionEnd(b)},begin,end,speed,[&](double at){
    const auto p=gateLeaf(a,gateOpening(a,at)),q=gateLeaf(b,gateOpening(b,at));s.gateStaticEvaluations++;
    return spatialNativePolygonPairDistance(p.data(),int(p.size()/2),q.data(),int(q.size()/2))-error;
  });
}
void gateStaticWitness(IntentState& s,uint64_t gate,int kind,double id,int gx,int gz,const GateSweepAnswer& answer){
  s.gateStaticResult={double(gate),double(kind),double(id),double(gx),double(gz),answer.from,answer.to,double(answer.reason)};
}
int gateSweepStaticObjects(IntentState& s,const std::map<uint64_t,NativeGate>& gates){
  for(const auto& [id,gate]:gates){
    if(gate.status==2)continue;
    double area=0;
    for(size_t i=0,j=gate.local.size()-2;i<gate.local.size();j=i,i+=2)
      area+=gate.local[j]*gate.local[i+1]-gate.local[i]*gate.local[j+1];
    if(!std::isfinite(area)||std::abs(area)<1e-12){
      s.gateStaticRejected++;gateStaticWitness(s,id,0,0,0,0,{false,4,s.effectiveTime,s.effectiveTime});return -7;}
    struct Query {IntentState& s;const NativeGate& gate;};Query query{s,gate};
    const auto& b=gate.unsupported;
    const int status=spatialVisitGateStaticObjects(b.minX,b.minZ,b.maxX,b.maxZ,
      [](const SpatialGateStaticObject& object,void* opaque){auto& q=*static_cast<Query*>(opaque);
        const auto answer=gateSweepStaticPair(q.s,q.gate,object.shape,q.s.effectiveTime,
          std::max(q.s.effectiveTime,gateMotionEnd(q.gate)));
        if(!answer.clear)gateStaticWitness(q.s,q.gate.id,object.kind,object.id,object.gx,object.gz,answer);
        return answer.clear;
      },&query);
    if(status!=1){
      s.gateStaticRejected++;
      if(status<0)gateStaticWitness(s,id,0,0,0,0,{false,status==-1?3:4,s.effectiveTime,s.effectiveTime});
      return status==-1?-6:status==-2?-7:-8;
    }
    for(auto other=gates.upper_bound(id);other!=gates.end();++other){
      if(other->second.status==2)continue;
      const auto& c=other->second.unsupported;
      if(b.maxX+.001<c.minX||b.minX-.001>c.maxX||b.maxZ+.001<c.minZ||b.minZ-.001>c.maxZ)continue;
      const auto answer=gateSweepLeafPair(s,gate,other->second,s.effectiveTime,
        std::max({s.effectiveTime,gateMotionEnd(gate),gateMotionEnd(other->second)}));
      if(!answer.clear){s.gateStaticRejected++;gateStaticWitness(s,id,4,double(other->first),0,0,answer);return -8;}
    }
  }
  return 1;
}

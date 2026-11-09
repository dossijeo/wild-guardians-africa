bool gateStaticProofCurrent(const IntentState& s){
  return !s.gateStaticProofs||s.gateStaticWorldStamp==executionWorldStamp();
}
void updateGateStaticDomain(IntentState& s){
  const int previous=s.gateStaticProofs;
  s.gateStaticProofs=0;
  for(const auto& [id,gate]:s.gates)if(gate.staticSweepCertified)s.gateStaticProofs++;
  if(previous!=s.gateStaticProofs)s.residencyPinRevision++;
  s.gateStaticWorldStamp=executionWorldStamp();
}
bool gateStaticMutationStart(IntentState& s,SpatialStaticTicket& ticket){
  if(!s.gateStaticProofs)return true;
  ticket.gateObjects=true;ticket.before=executionWorldStamp();
  if(!gateStaticProofCurrent(s)){ticket.allowed=false;s.gateStaticRejected++;return false;}
  return true;
}
bool gateStaticOverlayPreflight(IntentState& s,const SpatialStaticMutation* shapes,int count){
  if(!s.gateStaticProofs)return true;
  if(!gateStaticProofCurrent(s)||count<0||count&&!shapes){s.gateStaticRejected++;return false;}
  for(const auto& [id,gate]:s.gates){
    if(!gate.staticSweepCertified)continue;const auto& b=gate.unsupported;
    for(int i=0;i<count;i++){
      const auto& c=shapes[i];
      if(b.maxX+.001<c.minX||b.minX-.001>c.maxX||b.maxZ+.001<c.minZ||b.minZ-.001>c.maxZ)continue;
      const auto answer=gateSweepStaticPair(s,gate,c,s.effectiveTime,std::max(s.effectiveTime,gateMotionEnd(gate)));
      if(!answer.clear){s.gateStaticRejected++;gateStaticWitness(s,id,5,0,0,0,answer);return false;}
    }
  }
  return true;
}
bool gateStaticRegionPreflight(IntentState& s,const SpatialStaticMutation* bounds,int count,int kind){
  if(!s.gateStaticProofs)return true;
  if(!gateStaticProofCurrent(s)||count<0||count&&!bounds){s.gateStaticRejected++;return false;}
  // Keep the canonical object data and support inputs used by this object-only
  // proof. This veto is not a claim to certify the leaf against terrain in 3D.
  constexpr double pad=spatialResidencyDependencyPadding+.001;
  for(const auto& [id,gate]:s.gates)if(gate.staticSweepCertified){const auto& b=gate.unsupported;
    for(int i=0;i<count;i++){const auto& c=bounds[i];
      if(b.maxX+pad<c.minX||b.minX-pad>c.maxX||b.maxZ+pad<c.minZ||b.minZ-pad>c.maxZ)continue;
      s.gateStaticRejected++;gateStaticWitness(s,id,kind,0,0,0,{false,5,s.effectiveTime,s.effectiveTime});return false;
    }
  }
  return true;
}
void gateStaticMutationCommitted(IntentState& s,const SpatialStaticTicket& ticket,
    std::array<uint64_t,3> delta){
  if(!ticket.allowed||!ticket.gateObjects||!s.gateStaticProofs||s.gateStaticWorldStamp!=ticket.before)return;
  const auto after=executionWorldStamp();
  for(size_t i=0;i<3;i++)if(after[i]!=ticket.before[i]+delta[i])return;
  s.gateStaticWorldStamp=after;
}
bool gateStaticRegistrationClear(IntentState& s,const NativeGate& proposed){
  if(!s.gateStaticProofs||proposed.status==2)return true;
  if(!gateStaticProofCurrent(s)||!proposed.defined)return false;
  const auto& b=proposed.unsupported;
  for(const auto& [id,gate]:s.gates)if(gate.staticSweepCertified){const auto& c=gate.unsupported;
    if(b.maxX+.001<c.minX||b.minX-.001>c.maxX||b.maxZ+.001<c.minZ||b.minZ-.001>c.maxZ)continue;
    const auto answer=gateSweepLeafPair(s,gate,proposed,s.effectiveTime,std::max(s.effectiveTime,gateMotionEnd(gate)));
    if(!answer.clear){s.gateStaticRejected++;gateStaticWitness(s,id,4,double(proposed.id),0,0,answer);return false;}
  }
  return true;
}

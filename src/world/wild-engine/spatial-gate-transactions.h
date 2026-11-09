void cancelGateMotionProposal(IntentState& s){
  s.gateMotionProposal.pending=false;s.gateMotionProposal.gates.clear();
}
// Shared by immediate opt-in motor preparation and asynchronous staging. It
// writes only the proposed map until every native body/policy proof succeeds.
int proposeGateMotion(IntentState& s,int enabled,std::map<uint64_t,NativeGate>& proposed,bool staticObjects=false){
  s.gateSweepResult.fill(0);s.gateStaticResult.fill(0);if(enabled!=0&&enabled!=1)return -1;
  proposed=s.gates;
  for(auto& [id,gate]:proposed){
    gate.staticSweepCertified=false;
    if(gate.status!=2&&!gate.defined)return -2;
    const double current=gateOpening(gate,s.effectiveTime);
    if(!enabled||gate.status==1){gate.from=gate.target=current;gate.at=s.effectiveTime;
      if(!gateSweepBodies(s,gate)){s.gateSweepRejected++;return -3;}continue;}
    if(gate.status==2){gate.from=gate.target=0;gate.at=s.effectiveTime;gate.defined=true;continue;}
    const auto facts=gateFacts(s,gate);if(!facts.complete)return -2;
    gate.from=current;gate.target=facts.requested||facts.occupied?1:0;
    gate.at=s.effectiveTime;gate.defined=true;gate.requested=facts.requested;gate.occupied=facts.occupied;
    if(!gateSweepBodies(s,gate)){s.gateSweepRejected++;return -3;}
  }
  if(staticObjects){const int result=gateSweepStaticObjects(s,proposed);if(result!=1)return result;}
  for(auto& [id,gate]:proposed)gate.bodySweepCertified=gate.status!=2;
  for(auto& [id,gate]:proposed)gate.staticSweepCertified=staticObjects&&gate.status!=2;
  return int(proposed.size());
}
void publishGateMotion(IntentState& s,std::map<uint64_t,NativeGate>& proposed){
  s.gates.swap(proposed);updateGateStaticDomain(s);
}
bool gateMotionProposalCurrent(const IntentState& s){
  const auto& p=s.gateMotionProposal;
  return p.pending&&p.session==s.session&&p.at==s.effectiveTime&&
    p.bodies==spatialBodiesMutationRevision()&&p.bodies!=std::numeric_limits<uint64_t>::max()&&
    p.entities==s.entityRevision&&p.factsSequence==s.sequence&&p.intents==s.intentSequence&&
    p.reservations==s.residencyPinRevision&&p.world==executionWorldStamp();
}

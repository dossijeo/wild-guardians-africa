// Residency is availability, not a new solid obstacle. Loading deterministic
// data is monotonic; eviction first protects current proof data, then retires
// future routes depending on it. Both use the existing native inverse indices.
SpatialStaticTicket residencyMutationBefore(IntentState& s,const SpatialResidencyRegion* regions,int count,bool removing,bool releaseOnly){
  SpatialStaticTicket ticket;if(!s.bodyDomainActive&&s.reservedBodies.empty()&&!s.gateStaticProofs)return ticket;
  if(!gateStaticMutationStart(s,ticket))return ticket;
  std::vector<SpatialStaticMutation> bounds;bounds.reserve(size_t(count));
  for(int i=0;i<count;i++){
    const auto& r=regions[i];
    if(!coordinate(r.minX)||!coordinate(r.minZ)||!coordinate(r.maxX)||!coordinate(r.maxZ)){
      ticket.allowed=false;s.residencyRejected++;return ticket;
    }
    SpatialStaticMutation shape;shape.minX=r.minX;shape.minZ=r.minZ;shape.maxX=r.maxX;shape.maxZ=r.maxZ;
    shape.x=(r.minX+r.maxX)*.5;shape.z=(r.minZ+r.maxZ)*.5;
    shape.halfX=(r.maxX-r.minX)*.5;shape.halfZ=(r.maxZ-r.minZ)*.5;bounds.push_back(shape);
  }
  if(removing&&!gateStaticRegionPreflight(s,bounds.data(),count,6)){ticket.allowed=false;return ticket;}
  if(!s.bodyDomainActive&&s.reservedBodies.empty())return ticket;
  ticket.executing=true;ticket.before=executionWorldStamp();ticket.tracked=s.executionWorldStamp==ticket.before;
  if(!removing)return ticket;
  ticket.allowed=mutationBodiesClear(bounds.data(),count,spatialResidencyDependencyPadding,
    s.residencyBodyChecks,s.residencyRejected);
  if(!ticket.allowed)return ticket;
  std::set<uint64_t> affected;
  if(!mutationAffectedRoutes(s,bounds.data(),count,spatialResidencyDependencyPadding,
      s.residencyCandidates,s.residencySegments,affected,true)){
    ticket.allowed=false;s.residencyRejected++;return ticket;
  }
  if(releaseOnly&&!affected.empty()){
    // A drawing/resource eviction cannot cancel an authorized simulation route.
    ticket.allowed=false;s.residencyRejected++;return ticket;
  }
  retireMutationRoutes(s,affected,s.residencyRevocations);return ticket;
}
void residencyMutationCommitted(IntentState& s,const SpatialStaticTicket& ticket,int count){
  if(count>0)gateStaticMutationCommitted(s,ticket,{0,uint64_t(count),0});
  if(!ticket.executing||!ticket.allowed||count<=0)return;
  s.residencyCommits+=uint64_t(count);const auto after=executionWorldStamp();
  if(ticket.tracked&&s.executionEnabled&&s.executionWorldStamp==ticket.before&&
     after[0]==ticket.before[0]&&after[2]==ticket.before[2]&&after[1]==ticket.before[1]+uint64_t(count))
    s.executionWorldStamp=after;
}

// A prop suppression changes the shared generation-input revision, but not the
// relief. Only canonical newly solid props need current-body/future-route checks.
SpatialStaticTicket propMutationBefore(IntentState& s,const SpatialStaticMutation* shapes,
    int count,int recipes,bool known){
  SpatialStaticTicket ticket;ticket.preview=s.worldMutationPreview;if(!gateStaticMutationStart(s,ticket))return ticket;
  if(s.gateStaticProofs&&!known){s.gateStaticRejected++;ticket.allowed=false;return ticket;}
  if(!gateStaticOverlayPreflight(s,shapes,count)){ticket.allowed=false;return ticket;}
  if(!s.bodyDomainActive&&s.reservedBodies.empty())return ticket;
  ticket.executing=true;ticket.before=executionWorldStamp();ticket.tracked=s.executionWorldStamp==ticket.before;
  s.propMutationRecipeChunks+=uint64_t(recipes);
  if(!known){ticket.allowed=false;s.propMutationRejected++;return ticket;}
  ticket.allowed=mutationBodiesClear(shapes,count,0,s.propMutationBodyChecks,s.propMutationRejected);
  if(!ticket.allowed)return ticket;
  std::set<uint64_t> affected;
  if(!mutationAffectedRoutes(s,shapes,count,0,s.propMutationCandidates,s.propMutationSegments,affected,true)){
    ticket.allowed=false;s.propMutationRejected++;return ticket;
  }
  if(!ticket.preview)retireMutationRoutes(s,affected,s.propMutationRevocations);return ticket;
}
void propMutationCommitted(IntentState& s,const SpatialStaticTicket& ticket,int terrainDelta){
  gateStaticMutationCommitted(s,ticket,{uint64_t(terrainDelta),0,0});
  if(!ticket.executing||!ticket.allowed)return;
  s.propMutationCommits++;const auto after=executionWorldStamp();
  if(ticket.tracked&&s.executionEnabled&&s.executionWorldStamp==ticket.before&&
     after[0]==ticket.before[0]+uint64_t(terrainDelta)&&after[1]==ticket.before[1]&&after[2]==ticket.before[2])
    s.executionWorldStamp=after;
}

// Included in the existing native intent authority. Only actual static mutation
// entry points call these functions; no actor tick/draw revalidates a route.
bool mutationBodiesClear(const SpatialStaticMutation* shapes,int count,double padding,
    uint64_t& checks,uint64_t& rejected){
  struct Query {const SpatialStaticMutation& shape;double padding;uint64_t& checks;bool blocked=false;};
  for(int i=0;i<count;i++){
    const auto& shape=shapes[i];Query query{shape,padding,checks};
    spatialVisitBodiesBox(shape.minX-2-padding,shape.minZ-2-padding,shape.maxX+2+padding,shape.maxZ+2+padding,
      [](uint64_t,const SpatialBodyView& body,void* context){
        auto& q=*static_cast<Query*>(context);
        if(q.blocked||!(body.flags&1))return;
        q.checks++;
        if(spatialStaticMutationBlocks(q.shape,body.x,body.z,body.x,body.z,body.r+q.padding,body.kind,true))q.blocked=true;
      },&query);
    if(query.blocked){rejected++;return false;}
  }
  return true;
}
bool staticMutationPreflight(IntentState& s,const SpatialStaticMutation* shapes,int count){
  return gateStaticOverlayPreflight(s,shapes,count)&&
    (!s.bodyDomainActive||mutationBodiesClear(shapes,count,0,s.staticMutationBodyChecks,s.staticMutationRejected));
}
bool mutationAffectedRoutes(IntentState& s,const SpatialStaticMutation* shapes,int count,double padding,
    uint64_t& candidateCount,uint64_t& segmentCount,std::set<uint64_t>& affected,bool allowPrepared=false){
  std::set<uint64_t> candidates;
  for(int i=0;i<count;i++){
    const auto& shape=shapes[i];
    const auto actors=reservationBoxCandidates(s,shape.minX,shape.minZ,shape.maxX,shape.maxZ);
    candidates.insert(actors.begin(),actors.end());
  }
  for(uint64_t actor:candidates){
    const auto found=s.activeIntents.find(actor);
    if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)continue;
    const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];if(!route.reserved)continue;
    if(!executionBindingCoherent(s,route.reservationBody,intent.slot)||(!route.hasExecution&&!allowPrepared)||
       intent.routeCursor>route.points.size()/2){
      return false;
    }
    candidateCount++;
    for(int shapeIndex=0;shapeIndex<count&&!affected.count(actor);shapeIndex++){
      const auto& shape=shapes[shapeIndex];
      double x=route.hasExecution?route.executionPose[0]:route.originX,
        z=route.hasExecution?route.executionPose[1]:route.originZ;
      const int kind=intent.animal?1:0;
      if(intent.routeCursor==route.points.size()/2){
        segmentCount++;
        if(spatialStaticMutationBlocks(shape,x,z,x,z,route.radius+padding,kind))affected.insert(actor);
      }
      for(size_t i=size_t(intent.routeCursor)*2;i<route.points.size();i+=2){
        const double nx=route.points[i],nz=route.points[i+1];segmentCount++;
        if(spatialStaticMutationBlocks(shape,x,z,nx,nz,route.radius+padding,kind)){affected.insert(actor);break;}
        x=nx;z=nz;
      }
    }
  }
  return true;
}
void retireMutationRoutes(IntentState& s,const std::set<uint64_t>& affected,uint64_t& revocations){
  for(uint64_t actor:affected){
    auto& intent=s.activeIntents.at(actor);
    if(intent.state!=PlanningState::RouteActive||!s.routeSlots[intent.slot].reserved)continue;
    stopRouteForEvent(s,intent);
    s.invalidations++;revocations++;emitIntentChange(s,intent);
  }
}
SpatialStaticTicket staticMutationBefore(IntentState& s,const SpatialStaticMutation* shapes,int count){
  SpatialStaticTicket ticket;if(!gateStaticMutationStart(s,ticket))return ticket;
  if(!s.bodyDomainActive){ticket.allowed=gateStaticOverlayPreflight(s,shapes,count);return ticket;}
  ticket.executing=true;ticket.before=executionWorldStamp();
  ticket.tracked=s.executionWorldStamp==ticket.before;
  ticket.allowed=staticMutationPreflight(s,shapes,count);if(!ticket.allowed)return ticket;
  if(!s.executionEnabled)return ticket; // Standing bodies still own their footprint, not a future route.
  std::set<uint64_t> affected;
  if(!mutationAffectedRoutes(s,shapes,count,0,s.staticMutationCandidates,s.staticMutationSegments,affected)){
    ticket.allowed=false;s.staticMutationRejected++;return ticket;
  }
  // No geometry/ID/revision has changed yet. Stop events and their held-disc
  // conflict closure precede the actual world mutation.
  retireMutationRoutes(s,affected,s.staticMutationRevocations);
  return ticket;
}
void staticMutationCommitted(IntentState& s,const SpatialStaticTicket& ticket){
  gateStaticMutationCommitted(s,ticket,{0,0,1});
  if(!ticket.executing||!ticket.allowed)return;
  s.staticMutationCommits++;
  const auto after=executionWorldStamp();
  // A known overlay-only primitive can extend the surviving cohort's proof.
  // Never acknowledge a prior terrain/residency edit or an untracked operation.
  if(ticket.tracked&&s.executionEnabled&&s.executionWorldStamp==ticket.before&&
     after[0]==ticket.before[0]&&after[1]==ticket.before[1]&&after[2]==ticket.before[2]+1)
    s.executionWorldStamp=after;
}

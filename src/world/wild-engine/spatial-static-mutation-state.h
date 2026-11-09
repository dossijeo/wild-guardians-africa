// Included in the existing native intent authority. Only actual static mutation
// entry points call these functions; no actor tick/draw revalidates a route.
bool staticMutationPreflight(IntentState& s,const SpatialStaticMutation* shapes,int count){
  if(!s.executionEnabled)return true;
  struct Query {IntentState& s;const SpatialStaticMutation& shape;bool blocked=false;};
  for(int i=0;i<count;i++){
    const auto& shape=shapes[i];Query query{s,shape};
    spatialVisitBodiesBox(shape.minX-2,shape.minZ-2,shape.maxX+2,shape.maxZ+2,
      [](uint64_t,const SpatialBodyView& body,void* context){
        auto& q=*static_cast<Query*>(context);
        if(q.blocked||!(body.flags&1))return;
        q.s.staticMutationBodyChecks++;
        if(spatialStaticMutationBlocks(q.shape,body.x,body.z,body.x,body.z,body.r,body.kind,true))q.blocked=true;
      },&query);
    if(query.blocked){s.staticMutationRejected++;return false;}
  }
  return true;
}
SpatialStaticTicket staticMutationBefore(IntentState& s,const SpatialStaticMutation* shapes,int count){
  SpatialStaticTicket ticket;if(!s.executionEnabled)return ticket;
  ticket.executing=true;ticket.before=executionWorldStamp();
  ticket.tracked=s.executionWorldStamp==ticket.before;
  ticket.allowed=staticMutationPreflight(s,shapes,count);if(!ticket.allowed)return ticket;
  std::set<uint64_t> candidates,affected;
  for(int i=0;i<count;i++){
    const auto& shape=shapes[i];
    const auto actors=reservationBoxCandidates(s,shape.minX,shape.minZ,shape.maxX,shape.maxZ);
    candidates.insert(actors.begin(),actors.end());
  }
  for(uint64_t actor:candidates){
    const auto found=s.activeIntents.find(actor);
    if(found==s.activeIntents.end()||found->second.state!=PlanningState::RouteActive)continue;
    const auto& intent=found->second;const auto& route=s.routeSlots[intent.slot];if(!route.reserved)continue;
    if(!executionBindingCoherent(s,route.reservationBody,intent.slot)||!route.hasExecution||
       intent.routeCursor>route.points.size()/2){
      ticket.allowed=false;s.staticMutationRejected++;return ticket;
    }
    s.staticMutationCandidates++;
    for(int shapeIndex=0;shapeIndex<count&&!affected.count(actor);shapeIndex++){
      const auto& shape=shapes[shapeIndex];
      double x=route.executionPose[0],z=route.executionPose[1];
      const int kind=intent.animal?1:0;
      if(intent.routeCursor==route.points.size()/2){
        s.staticMutationSegments++;
        if(spatialStaticMutationBlocks(shape,x,z,x,z,route.radius,kind))affected.insert(actor);
      }
      for(size_t i=size_t(intent.routeCursor)*2;i<route.points.size();i+=2){
        const double nx=route.points[i],nz=route.points[i+1];s.staticMutationSegments++;
        if(spatialStaticMutationBlocks(shape,x,z,nx,nz,route.radius,kind)){affected.insert(actor);break;}
        x=nx;z=nz;
      }
    }
  }
  // No geometry/ID/revision has changed yet. Stop events and their held-disc
  // conflict closure are emitted before the caller makes its obstacle effective.
  for(uint64_t actor:affected){
    auto& intent=s.activeIntents.at(actor);
    if(intent.state!=PlanningState::RouteActive||!s.routeSlots[intent.slot].reserved)continue;
    releaseRoute(s,intent);intent.state=PlanningState::NeedsPlan;
    s.invalidations++;s.staticMutationRevocations++;emitIntentChange(s,intent);
  }
  return ticket;
}
void staticMutationCommitted(IntentState& s,const SpatialStaticTicket& ticket){
  if(!ticket.executing||!ticket.allowed)return;
  s.staticMutationCommits++;
  const auto after=executionWorldStamp();
  // A known overlay-only primitive can extend the surviving cohort's proof.
  // Never acknowledge a prior terrain/residency edit or an untracked operation.
  if(ticket.tracked&&s.executionEnabled&&s.executionWorldStamp==ticket.before&&
     after[0]==ticket.before[0]&&after[1]==ticket.before[1]&&after[2]==ticket.before[2]+1)
    s.executionWorldStamp=after;
}

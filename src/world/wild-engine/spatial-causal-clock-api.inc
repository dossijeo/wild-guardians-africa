EMSCRIPTEN_KEEPALIVE int nav_intent_clock_version(){return 1;}
// Only a coherent native execution cohort may authorize presentation time.
// Check structural membership at intent events; ordinary execution already
// checks its bindings and mutation stamp, without revalidating route geometry.
bool causalClockCohortReady(IntentState& s){
  if(!gateStaticProofCurrent(s)||s.executionEnabled&&s.executionWorldStamp!=executionWorldStamp()||
     !s.reservedBodies.empty()&&!s.executionEnabled)return false;
  if(s.clockProofSequence==s.intentSequence)return true;
  for(const auto& [actor,intent]:s.activeIntents)if(intent.state==PlanningState::RouteActive){
    if(intent.slot>=s.routeSlots.size())return false;
    const auto& route=s.routeSlots[intent.slot];
    if(!route.reserved||!route.hasExecution||!executionBindingCoherent(s,route.reservationBody,intent.slot))return false;
  }
  s.clockProofSequence=s.intentSequence;return true;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_clock_commit(double rate,int paused){
  auto& s=state();if(!s.session||!std::isfinite(rate)||rate<=0||rate>1000000||(paused!=0&&paused!=1))return -1;
  if(!causalClockCohortReady(s))return -2;
  if(s.clockSequence>=uint64_t(maxId)||s.effectiveTime<s.clockThrough)return -3;
  const bool policy=!s.causalClock||s.clockRate!=rate||s.clockPaused!=bool(paused);
  if(!policy&&s.clockThrough==s.effectiveTime&&s.clockIntentSequence==s.intentSequence)return 0;
  s.causalClock=true;s.clockPaused=paused;s.clockRate=rate;s.clockReanchor=policy;
  s.clockThrough=s.effectiveTime;s.clockIntentSequence=s.intentSequence;s.clockSequence++;return 1;
}
EMSCRIPTEN_KEEPALIVE int nav_intent_clock_snapshot(){
  auto& s=state();s.clockResult.fill(0);if(!s.causalClock)return 0;
  s.clockResult={1,double(s.session),double(s.clockSequence),double(s.clockIntentSequence),s.clockThrough,
    s.clockRate,s.clockPaused?1.0:0.0,s.clockReanchor?1.0:0.0};return 1;
}
EMSCRIPTEN_KEEPALIVE const double* nav_intent_clock_ptr(){return state().clockResult.data();}

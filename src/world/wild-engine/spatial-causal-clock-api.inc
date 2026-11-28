EMSCRIPTEN_KEEPALIVE int nav_intent_clock_version(){return 1;}
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

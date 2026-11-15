import {nativeResumeReferenceFromProposal,sameNativeResumeReference} from './native-resume-reference.js';
import {nativeTaskStartReferenceFromProposal,sameNativeTaskStartReference} from './native-task-start-reference.js';
import {nativeTaskActionActor,nativeTaskActionReferenceFromProposal,sameNativeTaskActionReference} from './native-task-action-presentation.js';
import {nativeTaskConsequenceReferenceFromProposal,sameNativeTaskConsequenceReference} from './native-task-consequence.js';

// Transport/resource identities only. Compatibility is reported by the current
// native revalidation; none of these profiles can issue an execution permission.
const routeCompatible=translation=>translation.sameFloat32Motion&&translation.sameFloat32Gates;
const profiles=Object.freeze({
  'task-consequence':Object.freeze({
    proposalKind:'native-task-consequence-proposal',
    templateField:'preparedTaskConsequenceTemplate',bindingField:'nativeTaskConsequenceBinding',releaseField:'nativeConsequences',
    reference:nativeTaskConsequenceReferenceFromProposal,sameReference:sameNativeTaskConsequenceReference,
    compatible:routeCompatible,
    attest(native,reference,preparedReference){
      const actual=issuedRoute(native,reference),fact=native.nativeTaskConsequenceBinding(reference.actorId);
      if(!fact||!sameNativeTaskConsequenceReference(fact.reference,reference)||
        !sameNativeTaskConsequenceReference(fact.preparedReference,preparedReference)||fact.assignmentSequence!==actual.assignmentSequence)
        throw Error('Native consequence resource association unavailable');
      return fact;
    }
  }),
  resume:Object.freeze({
    proposalKind:'native-route-resume-proposal',
    templateField:'preparedResumeTemplate',bindingField:'nativeResumeBinding',releaseField:'nativeResumedRoutes',
    reference:nativeResumeReferenceFromProposal,sameReference:sameNativeResumeReference,
    compatible:routeCompatible,
    attest(native,reference,preparedReference,protocol){
      const actual=issuedRoute(native,reference);
      return Object.freeze({reference,assignmentSequence:actual.assignmentSequence,
        ...(preparedReference?{preparedReference,projectionVersion:1,gateIds:protocol.gateIds()}:{})});
    }
  }),
  'task-start':Object.freeze({
    proposalKind:'native-task-start-proposal',
    templateField:'preparedTaskStartTemplate',bindingField:'nativeTaskStartBinding',releaseField:'nativeStartedRoutes',
    reference:nativeTaskStartReferenceFromProposal,sameReference:sameNativeTaskStartReference,
    compatible:routeCompatible,
    attest(native,reference,preparedReference){
      const actual=issuedRoute(native,reference),fact=native.nativeTaskStartBinding(reference.actorId);
      if(!fact||!sameNativeTaskStartReference(fact.reference,reference)||
        !sameNativeTaskStartReference(fact.preparedReference,preparedReference)||fact.assignmentSequence!==actual.assignmentSequence)
        throw Error('Native first-task resource association unavailable');
      return fact;
    }
  }),
  'task-action':Object.freeze({
    proposalKind:'native-task-action-proposal',
    templateField:'preparedTaskActionTemplate',bindingField:'nativeTaskActionBinding',releaseField:'nativeActions',
    reference:nativeTaskActionReferenceFromProposal,sameReference:sameNativeTaskActionReference,
    compatible:translation=>translation.sameSourceState,
    attest(native,reference,preparedReference){
      const fact=native.nativeTaskActionBinding(nativeTaskActionActor(reference.request));
      if(!fact||!sameNativeTaskActionReference(fact.reference,reference)||
        !sameNativeTaskActionReference(fact.preparedReference,preparedReference))
        throw Error('Native action resource association unavailable');
      return fact;
    }
  })
});

function issuedRoute(native,reference){
  const actual=native.nativeRouteTiming(reference.expectedRouteHandle);
  if(!actual||actual.actorId!==reference.actorId||actual.startTime!==reference.worldBoundary.effectiveTime||
    actual.endTime!==reference.endTime||actual.assignmentSequence<=reference.sourceControlSequence||
    native.nativeSuspendedGateRoute(reference.actorId)!==null)
    throw Error('Committed native resume differs from its proposed assignment');
  return actual;
}

export function nativeResourceAdmissionProfile(kind='resume'){
  if(!Object.hasOwn(profiles,kind))throw TypeError('Unsupported native admission motion');
  return profiles[kind];
}

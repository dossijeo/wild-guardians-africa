import {physicsOwners} from './host-publication-queue.js';

// The graphical consumer receives the original publication directly. The
// interface consumer retains state, events and a compact collision boundary.
export function projectMainThreadPublication(publication){
 if(publication?.unchanged===true)return publication;
 const owners=physicsOwners(publication);
 if(owners===null)return publication;
 const {physicsPose,physicsPoses,motionTrace,worldMotionTrace,presentationWorkerHeadings,...rest}=publication;
 return {...rest,physicsOwnerSummary:owners};
}

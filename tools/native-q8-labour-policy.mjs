// Frozen diagnostic changes only startup choice; Q7 delivery gates retained.
import {createQ7LabourPolicy} from './native-q7-labour-policy.mjs';
export function createQ8LabourPolicy({profile='olderFemale'}={}){
 return createQ7LabourPolicy({profile,openingStaff:6});
}

// Static evidence only: literal emit arguments and simple named ternaries.
// Never infer a dynamic event expression or claim that a branch was executed.
export function literalEventProducers(line){
 const events=[];
 for(const match of line.matchAll(/\bemit\([^,]+,\s*['"](\w+)['"]/g))events.push({event:match[1],selector:match[0]});
 for(const match of line.matchAll(/\bemit\([^,]+,\s*([A-Za-z_$][\w.$]*)\s*\?\s*['"](\w+)['"]\s*:\s*['"](\w+)['"]/g)){
  events.push({event:match[2],selector:match[0],branch:match[1]+' true'});
  events.push({event:match[3],selector:match[0],branch:match[1]+' false'});
 }
 return events;
}

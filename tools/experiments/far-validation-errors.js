// QA-only aggregation: completed paths must inspect nested GPU ownership errors.
export function farValidationErrors(errors,owner){
 const rows=[...errors];
 for(const error of owner?.stats?.errors??[])rows.push('owner: '+error);
 for(const [slot,adapter] of (owner?.adapters??[]).entries()){
  for(const error of adapter.stats?.errors??[])rows.push('species '+slot+': '+error);
  for(const error of adapter.stats?.standby?.errors??[])rows.push('species '+slot+' standby: '+error);
 }
 return rows;
}

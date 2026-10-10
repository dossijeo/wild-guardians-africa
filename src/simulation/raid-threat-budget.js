import {BALANCE as B} from './balance.js';
// The calendar changes only ordinary night budget selection; no RNG draws.
// Existing plans remain owned by the save and are never recomputed here.
export function nightThreatBudget(day,tier,postgame=false,balance=B){
 const base={min:tier.threat_min,max:tier.threat_max};
 if(postgame||day<=5)return base;
 const stage=balance.raids.night_budget_calendar?.find(s=>day>=s.first_night&&day<=s.last_night);
 if(!stage)return base;
 const index=balance.threat_tiers.findIndex(t=>t.attraction_min===tier.attraction_min);
 if(index<0)throw Error('Raid budget calendar requires native attraction tier');
 const [min,max]=stage.tier_budgets[index];return {min,max};
}

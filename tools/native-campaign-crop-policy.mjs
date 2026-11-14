// QA purchase decisions only. Native prices, water, growth and income stay fixed.
import {cropSpec} from '../src/simulation/rules.js';
export const CASHFLOW_CROP_SETTINGS=Object.freeze({starterPurchases:30,longCropEvery:8,minimumFreeCash:100,longCrop:'yuca'});
export function campaignCropChoice({policy='legacy',mixed=true,day,cash,purchased,reserved=0}){
 if(!['legacy','cashflow'].includes(policy))throw Error('Unknown crop policy');
 if(!Number.isSafeInteger(day)||day<1||!Number.isSafeInteger(purchased)||purchased<0||!Number.isFinite(cash)||!Number.isFinite(reserved)||reserved<0)throw Error('Invalid crop decision');
 if(policy==='legacy')return mixed&&day>=10&&cash>1000?['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'][purchased%8]:'mijo';
 const q=CASHFLOW_CROP_SETTINGS;
 // Reserve checks remain enforced by actual purchase code. This is a mix,
 // never a limit on farm size, number of purchases or worker production.
 return purchased>=q.starterPurchases&&purchased%q.longCropEvery===q.longCropEvery-1&&cash-reserved>=q.minimumFreeCash+cropSpec(q.longCrop).plant_cost?q.longCrop:'mijo';
}

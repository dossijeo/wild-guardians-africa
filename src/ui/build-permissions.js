import {BALANCE} from '../simulation/balance.js';
import {permission} from '../simulation/rules.js';
import {numberOf} from '../simulation/money.js';

export function refreshBuildPermissions(root,state){
  for(const [id,action] of [['native-center','center'],['native-wall','wall']]){
    const button=root.querySelector('#'+id);
    if(button)button.disabled=!permission(state,action);
  }
  for(const button of root.querySelectorAll('[data-wall]')){
    const spec=BALANCE.walls.find(w=>w.id===button.dataset.wall);
    button.disabled=!permission(state,'wall')||!spec||numberOf(state.ledger.balance)<spec.cost;
  }
}

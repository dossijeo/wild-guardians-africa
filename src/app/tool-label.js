import {BALANCE as B} from '../simulation/balance.js';
import {cropSpec} from '../simulation/rules.js';
export function toolLabel(tool){
 if(!tool)return '';
 if(tool.kind==='village')return 'Fundar poblado';
 if(tool.kind==='center')return 'Coloca el centro de trabajo';
 if(tool.kind==='plant'){const crop=cropSpec(tool.species);return `Plantar ${crop.name} · ${crop.plant_cost} monedas`;}
 if(tool.kind==='wall')return `${tool.gate?'Coloca una puerta':'Arrastra para trazar una muralla'} de ${B.walls.find(w=>w.id===tool.material).name}`;
 if(tool.kind==='spell')return `Colocar ${B.spells.find(s=>s.id===tool.spell).name}`;
 return '';
}

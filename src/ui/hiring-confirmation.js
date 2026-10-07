import {hiringCost} from '../simulation/workforce.js';

export function hiringConfirmation(selection,available,options={}){
  const cost=hiringCost(selection,options);
  const count=Object.values(selection).reduce((sum,value)=>sum+value,0);
  const canConfirm=count>0&&cost<=available;
  const message=count===0?'Selecciona al menos un trabajador.':cost>available?'Reduce la plantilla para ajustarla al saldo.':'El salario se cobra una sola vez al confirmar.';
  return {cost,count,canConfirm,message};
}

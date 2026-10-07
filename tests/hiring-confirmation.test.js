import test from 'node:test';
import assert from 'node:assert/strict';
import {hiringConfirmation} from '../src/ui/hiring-confirmation.js';

test('empty selections cannot start a workday, including after clearing every profile',()=>{
  for(const selection of [{},{youngMale:0,youngFemale:0,olderMale:0,olderFemale:0}]){
    const result=hiringConfirmation(selection,1500);
    assert.equal(result.canConfirm,false);assert.equal(result.cost,0);
    assert.equal(result.message,'Selecciona al menos un trabajador.');
  }
});
test('confirmation tracks both crew and available money for initial and proportional hiring',()=>{
  assert.equal(hiringConfirmation({olderFemale:1},30).canConfirm,true);
  assert.equal(hiringConfirmation({olderFemale:1},29).canConfirm,false);
  assert.equal(hiringConfirmation({youngFemale:1},20,{time:150}).canConfirm,true);
  assert.equal(hiringConfirmation({youngFemale:1},19,{time:150}).canConfirm,false);
  assert.equal(hiringConfirmation({},20,{time:150}).canConfirm,false);
  assert.throws(()=>hiringConfirmation({olderFemale:-1},1500),/Cantidad inválida/);
});

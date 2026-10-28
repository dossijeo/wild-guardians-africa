import test from 'node:test';
import assert from 'node:assert/strict';
import {awakeningHudState,awakeningHudPlacement} from '../src/ui/awakening-hud.js';
import {newGame} from '../src/simulation/game.js';
import {awakeningState} from '../src/simulation/awakenings.js';

test('the HUD reads legacy progress without mutating the save and only enables an available charge',()=>{
  const s=newGame({seed:712}),before=JSON.stringify(s);
  assert.equal(awakeningHudState(s).progress,0);assert.equal(awakeningHudState(s).disabled,true);assert.equal(JSON.stringify(s),before);
  s.structures.push({id:'center',kind:'center',status:'intact'});awakeningState(s).progress=99.9;
  assert.equal(awakeningHudState(s).disabled,true);assert.match(awakeningHudState(s).label,/99 de 100/);
  s.awakenings.progress=100;assert.equal(awakeningHudState(s).available,true);
  s.pauses=['hiring'];assert.equal(awakeningHudState(s).disabled,true);
  s.pauses=[];assert.equal(awakeningHudState(s,{blocked:true}).disabled,true);
  s.time=420;s.raid={animals:[]};assert.equal(awakeningHudState(s).available,true,'banked awakenings can defend during an active night');
  assert.equal(awakeningHudState(s,{selecting:true}).disabled,false,'the same control remains available to cancel selection');
  s.awakenings.enabled=false;assert.equal(awakeningHudState(s).available,false);
});
function dims(w,h){
  const portrait=h>w*1.08,short=h<500,reserve=portrait?Math.min(125,h*.16):short?62:Math.min(120,h*.17),header=portrait?112:short?71:103;
  const gap=short?3:portrait?4:6,available=h-header-reserve-10-3*gap;
  const aw=Math.max(58,portrait?Math.min(Math.max(78,Math.min(108,w*.24)),available/4*.715):Math.min(Math.max(164,Math.min(221,w*.155)),available/4*2.17));
  return {w,h,portrait,short,reserve,header,aw};
}
for(const [w,h] of [[1280,720],[1024,768],[844,390],[740,360],[640,360],[568,320],[390,844],[360,640],[320,568],[768,1024]])
  test(`awakening layout fits ${w}×${h}, preserves the stats and leaves the tutorial reserve clear`,()=>{
    const d=dims(w,h),statsRight=d.short?426:568,menuLeft=w-(d.short?59:83),p=awakeningHudPlacement(d,{statsRight,menuLeft});
    const left=p.left??w-p.right-p.width,right=left+p.width;
    assert.ok(left>=0&&right<=w);assert.ok(p.width>=44&&p.height>=44);
    assert.ok(p.top+p.height<=h-d.reserve,'the new control stays above the original tutorial reserve');
    if(d.portrait){
      assert.equal(p.width,p.height);assert.ok(p.actions.width>=44);
      const actionsBottom=p.actions.top+4*p.actions.width/.715+3*p.actions.gap;
      assert.ok(p.top>=actionsBottom+p.actions.gap-1e-8,'medallion must never cover an action');
      assert.ok(p.actions.top>=d.header);
    }else if(!p.noticeOffset){assert.ok(left>statsRight);assert.ok(right<menuLeft);}
    else assert.ok(p.top>=d.header,'compact landscape allocates a separate row before notices');
  });

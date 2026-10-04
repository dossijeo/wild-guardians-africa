import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {centerFootprint} from '../src/world/centers.js';
import {navigationBounds,outsideNavigationBounds} from '../src/world/navigation-bounds.js';

function navigator(structures,culture='mapungubwe'){
  const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];nav.setState({structures,villages:[],spells:[],suppressed:[],culture});return nav;
}
test('Conservative obstacle bounds preserve exact point/segment collision results for all cultures and rotations',()=>{
  for(const culture of ['mapungubwe','saheliana','suajili','musgum','etiope'])for(const yaw of [0,.73,2.4]){
    const nav=navigator([{id:'center',kind:'center',culture,x:3,z:-4,yaw,status:'intact'},{id:'house',kind:'house',x:-9,z:8,radius:2.8,status:'intact'},{id:'wall',kind:'wall',x:7,z:3,yaw,baseScaleX:1,material:'madera',status:'intact'}],culture),bounds=nav.obstacleBounds;
    for(let i=0;i<160;i++){
      const a={x:(i*17%61)-30.125,z:(i*29%59)-29.375},b={x:(i*23%67)-33.25,z:(i*31%71)-35.5},radius=[.28,.9,1.8][i%3],worker=!!(i%2),ignore=i%5===0?'center':null;
      nav.obstacleBounds=undefined;const point=nav.testWalkable(a.x,a.z,radius,ignore,worker),segment=nav.testSegmentClear(a,b,radius,ignore,worker);
      nav.obstacleBounds=bounds;assert.equal(nav.testWalkable(a.x,a.z,radius,ignore,worker),point);assert.equal(nav.testSegmentClear(a,b,radius,ignore,worker),segment);
    }
  }
});
test('Bounds include tangencies and narrow crossings; setState replaces geometry bounds and previews fall back to exact polygons',()=>{
  const polygon=[{x:0,z:0},{x:4,z:0},{x:4,z:2},{x:0,z:2}],bounds=navigationBounds({footprint:polygon});
  assert.equal(outsideNavigationBounds({x:-1,z:-.28},{x:5,z:-.28},bounds,.28),false);
  assert.equal(outsideNavigationBounds({x:2,z:-3},{x:2,z:4},bounds,.28),false);
  assert.equal(outsideNavigationBounds({x:100,z:100},{x:103,z:100},bounds,.28),true);
  assert.equal(navigationBounds({kind:'wall',x:0,z:0,radius:.7}),null);assert.equal(navigationBounds({gate:true,x:0,z:0,radius:.7}),null);
  const nav=navigator([{id:'center',kind:'center',x:0,z:0,yaw:0,status:'intact'}]),old=nav.obstacleBounds,structure={id:'center',kind:'center',x:100,z:0,yaw:1,status:'intact'};
  nav.setState({structures:[structure],villages:[],spells:[],suppressed:[],culture:'mapungubwe'});assert.notEqual(nav.obstacleBounds,old);assert.equal(nav.testWalkable(100,0,.28,null,true),false);
  const proposed=centerFootprint({...structure,id:'preview',x:0},nav.state),preview=nav.forBuildingPlacement(proposed);assert.equal(preview.testWalkable(0,0,.28,null,true),false);assert.equal(nav.testWalkable(0,0,.28,null,true),true);
});

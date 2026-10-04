import test from 'node:test';
import assert from 'node:assert/strict';
import {primaryWorkCenter,savedFarmFocus} from '../src/rendering/farm-focus.js';
import {Navigation} from '../src/world/navigation.js';
const center=(id,x,z)=>({id,x,z,kind:'center',hp:800,status:'intact',created:0});
test('restore selects the centre nearest the first village, not array order or other villages',()=>{
 const s={villages:[{x:0,z:0},{x:80,z:0}],structures:[center('far',80,0),center('near',8,0)],plants:[{alive:true,centerId:'near',x:12,z:3},{alive:true,centerId:'near',x:16,z:7},{alive:true,centerId:'far',x:100,z:50},{alive:false,centerId:'near',x:1000,z:1000}]};
 const before=JSON.stringify(s);assert.equal(primaryWorkCenter(s).id,'near');const focus=savedFarmFocus(s);
 assert.deepEqual(focus,{x:14,z:5,theta:Math.atan2(6,5),distance:38});assert.equal(JSON.stringify(s),before);
});
test('empty farms focus the centre; ruined centres do not override a functioning one; no centre retains initial village view',()=>{
 const s={villages:[{x:0,z:0}],structures:[{...center('ruined',1,0),hp:0,status:'ruined'},center('live',8,0)],plants:[]};
 assert.deepEqual(savedFarmFocus(s),{x:8,z:0});s.structures=[];assert.deepEqual(savedFarmFocus(s),{x:20,z:0});
});
test('walls only reject pieces fully inside buildings, allowing edge intersections, water and lava',()=>{
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>true,slope:()=>2,surface:()=>0};nav.propsAt=()=>[];
 nav.obstacles=[{kind:'house',footprint:[{x:-3,z:-3},{x:3,z:-3},{x:3,z:3},{x:-3,z:3}]}];
 const wall={kind:'wall',x:0,z:0,yaw:0,material:'zarzas'};
 assert.equal(nav.wallPlacement(wall).valid,false);
 assert.equal(nav.wallPlacement({...wall,x:3}).valid,true);
 assert.equal(nav.wallPlacement({...wall,x:10}).valid,true);
 assert.equal(nav.placement(10,0,.4).valid,false);
 for(const yaw of [0,.5,Math.PI/2])assert.equal(nav.wallPlacement({...wall,yaw}).valid,false);
});

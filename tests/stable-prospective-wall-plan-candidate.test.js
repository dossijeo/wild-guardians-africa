import test from 'node:test';
import assert from 'node:assert/strict';
import {stableProspectiveWallPlan as stable} from '../tools/stable-prospective-wall-plan-candidate.mjs';
function fixture(){
 const state={structures:[{id:'actual-wall',x:0,hp:60}],villages:[],suppressed:[],culture:'mapungubwe'},nav={version:1,obstacles:[]};
 const quote=(counter=1)=>{const p={kind:'wall',id:`structure-${counter}`,created:counter+10,x:4,z:2,hp:60,gate:true};return {pieces:[p],previewPieces:[{...p}],updates:[{id:p.id,gate:true},{id:'actual-wall',gate:false}],suppressed:[],cost:10,gates:2};};
 return {state,nav,quote};
}
test('retains first provisional IDs only, including previews and gate updates',()=>{
 const {state,nav,quote}=fixture(),first=quote(),next=quote(3),before=structuredClone(next);
 assert.equal(stable(state,nav,first),first);assert.deepEqual(stable(state,nav,next),first);assert.deepEqual(next,before);
});
for(const [label,change] of [
 ['native epoch',f=>f.nav.version++],['actual damage',f=>f.state.structures[0].hp--],
 ['obstacle',f=>f.nav.obstacles.push({id:'tree',x:4})],['suppression',f=>f.state.suppressed.push('tree')],
 ['gate selection',(_f,p)=>p.pieces[0].gate=false],['position',(_f,p)=>p.pieces[0].x++],
 ['price',(_f,p)=>p.cost++],['actual gate update',(_f,p)=>p.updates[1].gate=true],
 ['additional piece',(_f,p)=>p.pieces.push({...p.pieces[0],id:'additional',x:9})],
])test(`invalidates on ${label}`,()=>{const f=fixture();stable(f.state,f.nav,f.quote());const p=f.quote(4);change(f,p);assert.equal(stable(f.state,f.nav,p),p);});
test('a real structure claiming a retained alias forces fresh native metadata',()=>{
 const f=fixture();stable(f.state,f.nav,f.quote());f.state.structures.push({id:'structure-1'});const p=f.quote(4);assert.equal(stable(f.state,f.nav,p),p);
});
test('a currently conflicting native quote is never transformed',()=>{
 const f=fixture();stable(f.state,f.nav,f.quote());f.nav.obstacles.push({id:'structure-4'});const p=f.quote(4);assert.equal(stable(f.state,f.nav,p),p);
});
test('state identities and navigator identities never share aliases',()=>{
 const f=fixture();stable(f.state,f.nav,f.quote());const p=f.quote(4);assert.equal(stable({...f.state},f.nav,p),p);assert.equal(stable(f.state,{...f.nav},p),p);
});
test('unsupported and empty plans discard prior record',()=>{
 const f=fixture();stable(f.state,f.nav,f.quote());const invalid=f.quote(3);invalid.pieces[0].kind='center';assert.equal(stable(f.state,f.nav,invalid),invalid);
 const p=f.quote(4);assert.equal(stable(f.state,f.nav,p),p);const empty={pieces:[],previewPieces:[],updates:[]};assert.equal(stable(f.state,f.nav,empty),empty);assert.equal(stable(f.state,f.nav,f.quote(6)).pieces[0].id,'structure-6');
});
test('duplicate virtual IDs never enter the alias record',()=>{
 const f=fixture(),p=f.quote();p.pieces.push({...p.pieces[0]});assert.equal(stable(f.state,f.nav,p),p);
});
